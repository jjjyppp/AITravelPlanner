// src/components/SpeechRecognition.jsx
import React, { useState, useRef, useEffect } from 'react';
import XunfeiSpeechService from '../services/xunfeiSpeechService';
import './SpeechRecognition.css';

const SpeechRecognition = ({ 
  onResult, 
  onError, 
  placeholder = "点击开始语音输入...",
  disabled = false,
  className = ""
}) => {
  const [isListening, setIsListening] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [testMicLevel, setTestMicLevel] = useState(0);
  const [result, setResult] = useState(''); // 仅用于界面显示
  
  const audioContextRef = useRef(null);
  const isStoppingRef = useRef(false);
  const audioProcessorRef = useRef(null);
  const audioSourceRef = useRef(null);
  const streamRef = useRef(null);
  const finalResultRef = useRef(''); // 累积的最终结果（不传递给父组件）
  const interimResultRef = useRef(''); // 临时中间结果
  const audioBufferRef = useRef([]);
  const sendTimerRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const lastAudioTimeRef = useRef(0);
  const sessionStartTimeRef = useRef(0);
  
  const speechServiceRef = useRef(null);

  // 初始化语音服务
  useEffect(() => {
    speechServiceRef.current = new XunfeiSpeechService();
    
    return () => {
      stopListening();
    };
  }, []);

  // 设置语音服务回调
  useEffect(() => {
    if (!speechServiceRef.current) return;

    speechServiceRef.current.setCallbacks({
      onMessage: (data) => {
        try {
          // 不再因为收到结束帧而自动停止录音，完全由用户手动控制
          if (XunfeiSpeechService.isEndFrame(data)) {
            console.log('收到服务端结束帧，但不会自动停止录音');
            return;
          }
          
          const recognitionResult = XunfeiSpeechService.processRecognitionResult(data);
          if (recognitionResult) {
            // 处理识别结果累积（不传递给父组件）
            handleRecognitionResult(data, recognitionResult);
          }
        } catch (err) {
          console.error('讯飞识别错误:', err);
          const errorMsg = '语音识别错误: ' + err.message;
          setErrorMessage(errorMsg);
          onError && onError(new Error(errorMsg));
        }
      },
      onError: (error) => {
        console.error('WebSocket错误:', error);
        const errorMsg = '连接讯飞服务失败: ' + (error.message || '未知错误');
        setErrorMessage(errorMsg);
        onError && onError(new Error(errorMsg));
        // stopListening();
      },
      onClose: () => {
        if (!isStoppingRef.current) {
          console.log('WebSocket连接关闭');
          // stopListening();
        }
      }
    });
  }, [onResult, onError]);

  // 处理识别结果累积
  const handleRecognitionResult = (data, recognitionResult) => {
    // 优先使用传入的recognitionResult作为识别文本
    const text = recognitionResult || data.text || (data.payload && data.payload.result && data.payload.result.text) || '';
    const status = data.status || (data.payload && data.payload.result && data.payload.result.status) || 0;
    
    // 检查是否是最终结果（status === 2）
    const isFinalResult = status === 2;
    
    if (isFinalResult) {
      // 最终结果：将中间结果累积到最终结果中
      if (interimResultRef.current) {
        finalResultRef.current = finalResultRef.current || '';
        finalResultRef.current += interimResultRef.current;
        interimResultRef.current = ''; // 清空中间结果
      }
      // 添加当前最终结果
      finalResultRef.current = (finalResultRef.current || '') + text;
      
      // 更新UI显示
      setResult(finalResultRef.current);
      
      console.log('累积最终结果:', finalResultRef.current);
      
      // 不再实时更新父组件，只在stopListening时传递最终结果
    } else {
      // 中间结果：更新临时中间结果
      interimResultRef.current = text;
      
      // 更新显示
      setResult(text);
      
      console.log('中间结果:', interimResultRef.current);
    }
  };

  // 智能音频活动检测
  const detectAudioActivity = (inputData, maxAmplitude) => {
    // 方法1: 基于最大振幅的检测
    if (maxAmplitude > 0.005) {
      return true;
    }
    
    // 方法2: 基于RMS(均方根)的检测
    let sum = 0;
    for (let i = 0; i < inputData.length; i++) {
      sum += inputData[i] * inputData[i];
    }
    const rms = Math.sqrt(sum / inputData.length);
    if (rms > 0.002) {
      return true;
    }
    
    return false;
  };

  // 开始录音
  const startListening = async () => {
    if (disabled || isListening) {
      return;
    }

    try {
      setErrorMessage('');
      setResult('');
      finalResultRef.current = ''; // 重置累积结果
      interimResultRef.current = ''; // 重置中间结果
      isStoppingRef.current = false;
      audioBufferRef.current = [];
      lastAudioTimeRef.current = Date.now();
      sessionStartTimeRef.current = Date.now();
      
      // 清理之前的定时器
      if (sendTimerRef.current) {
        clearInterval(sendTimerRef.current);
        sendTimerRef.current = null;
      }
      
      if (silenceTimerRef.current) {
        clearInterval(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      
      // 获取用户媒体权限
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      streamRef.current = stream;
      
      // 创建音频上下文
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext({
        sampleRate: 16000
      });
      
      // 确保音频上下文正在运行
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      // 创建音频源节点
      audioSourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      
      // 创建ScriptProcessor节点
      audioProcessorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      
      // 设置音频处理回调
      audioProcessorRef.current.onaudioprocess = (event) => {
        if (!isStoppingRef.current && speechServiceRef.current?.isConnected) {
          const inputData = event.inputBuffer.getChannelData(0);
          
          // 检查音频输入强度
          let maxAmplitude = 0;
          for (let i = 0; i < inputData.length; i++) {
            const amplitude = Math.abs(inputData[i]);
            maxAmplitude = Math.max(maxAmplitude, amplitude);
          }
          
          // 更新音频强度显示
          setAudioLevel(maxAmplitude * 100);
          
          // 检查是否有音频输入
          const hasAudio = detectAudioActivity(inputData, maxAmplitude);
          if (hasAudio) {
            lastAudioTimeRef.current = Date.now();
          }
          
          // 转换为16位整数数组
          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const sample = Math.max(-1, Math.min(1, inputData[i]));
            pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
          }
          
          // 将音频数据添加到缓冲区
          audioBufferRef.current.push(...pcmData);
        }
      };
      
      // 连接音频节点
      audioSourceRef.current.connect(audioProcessorRef.current);
      audioProcessorRef.current.connect(audioContextRef.current.destination);
      
      // 讯飞API凭证
      const XF_CONFIG = {
        appId: 'f7ae70c1',
        apiKey: '557206bc97aa567d51c22e37e2faa9b2',
        apiSecret: 'NTdmOGIyNjU3MWNkYzQzOGNmNWFjZGNi'
      };
      
      // 连接讯飞服务
      await speechServiceRef.current.connect(XF_CONFIG);
      
      // 发送第一帧
      speechServiceRef.current.sendInitialFrame();
      
      // 启动定时发送音频数据
      startSendingAudio();
      
      // 启动智能静音检测
      startSmartSilenceDetection();
      
      setIsListening(true);
    } catch (err) {
      console.error('启动录音失败:', err);
      const errorMsg = '启动录音失败: ' + (err.message || '未知错误');
      setErrorMessage(errorMsg);
      onError && onError(new Error(errorMsg));
      // stopListening();
    }
  };

  // 启动定时发送音频数据
  const startSendingAudio = () => {
    sendTimerRef.current = setInterval(() => {
      if (audioBufferRef.current.length >= 1280 && speechServiceRef.current?.isConnected) {
        const frameData = audioBufferRef.current.splice(0, 1280);
        const bytes = new Uint8Array(new Int16Array(frameData).buffer);
        
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64Data = btoa(binary);
        
        speechServiceRef.current.sendAudioData(base64Data);
      }
    }, 40);
  };

  // 定时日志记录（不再自动停止录音）
  const startSmartSilenceDetection = () => {
    silenceTimerRef.current = setInterval(() => {
      if (!isListening) return;
      
      const now = Date.now();
      const timeSinceLastAudio = now - lastAudioTimeRef.current;
      const totalSessionTime = now - sessionStartTimeRef.current;
      
      console.log('录音状态监控 - 会话时长:', Math.round(totalSessionTime/1000), '秒, 最后音频输入:', Math.round(timeSinceLastAudio/1000), '秒前');
    }, 5000);
  };

  // 停止录音
  const stopListening = () => {
    if (isStoppingRef.current) return;
    
    isStoppingRef.current = true;
    setIsListening(false);
    
    // 清理定时器
    if (sendTimerRef.current) {
      clearInterval(sendTimerRef.current);
      sendTimerRef.current = null;
    }
    
    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    
    // 确保所有中间结果都被合并到最终结果中
    if (interimResultRef.current) {
      finalResultRef.current = (finalResultRef.current || '') + interimResultRef.current;
      interimResultRef.current = '';
      // 更新UI显示
      setResult(finalResultRef.current);
    }
    
    // 发送剩余音频数据
    if (speechServiceRef.current?.isConnected) {
      // 发送缓冲区中剩余的音频数据
      while (audioBufferRef.current.length >= 1280) {
        const frameData = audioBufferRef.current.splice(0, 1280);
        const bytes = new Uint8Array(new Int16Array(frameData).buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64Data = btoa(binary);
        speechServiceRef.current.sendAudioData(base64Data);
      }
      
      // 发送最后不足一帧的数据
      if (audioBufferRef.current.length > 0) {
        const remainingData = new Int16Array(audioBufferRef.current);
        const bytes = new Uint8Array(remainingData.buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64Data = btoa(binary);
        speechServiceRef.current.sendAudioData(base64Data);
        audioBufferRef.current = [];
      }
      
      // 发送结束帧
      setTimeout(() => {
        if (speechServiceRef.current?.isConnected) {
          speechServiceRef.current.sendEndFrame();
        }
      }, 100);
    }
    
    // 断开音频连接
    cleanupAudioResources();
    
    // 在录音完全结束后，将最终结果传递给父组件
      setTimeout(() => {
        if (finalResultRef.current) {
          console.log('语音输入结束，传递最终结果给父组件:', finalResultRef.current);
          // 设置isReplace为false，确保父组件将识别结果追加到输入框内容后面
          onResult && onResult(finalResultRef.current, false);
        } else {
          console.log('没有识别到语音内容');
        }
        
        isStoppingRef.current = false;
      }, 200);
  };

  // 清理音频资源
  const cleanupAudioResources = () => {
    // 断开音频处理器连接
    if (audioProcessorRef.current) {
      try {
        audioProcessorRef.current.disconnect();
      } catch (e) {
        console.warn('断开音频处理器时出错:', e);
      }
      audioProcessorRef.current = null;
    }
    
    // 断开音频源连接
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.disconnect();
      } catch (e) {
        console.warn('断开音频源时出错:', e);
      }
      audioSourceRef.current = null;
    }
    
    // 停止音频流
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    
    // 关闭音频上下文
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(e => {
        console.warn('关闭音频上下文时出错:', e);
      });
      audioContextRef.current = null;
    }
  };

  // 测试麦克风
  const testMicrophone = async () => {
    if (isTestingMic) return;
    
    try {
      setIsTestingMic(true);
      setTestMicLevel(0);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1
        } 
      });
      
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContext({
        sampleRate: 16000
      });
      
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        let maxAmplitude = 0;
        for (let i = 0; i < inputData.length; i++) {
          maxAmplitude = Math.max(maxAmplitude, Math.abs(inputData[i]));
        }
        setTestMicLevel(maxAmplitude * 100);
      };
      
      source.connect(processor);
      processor.connect(audioContext.destination);
      
      // 5秒后停止测试
      setTimeout(() => {
        try {
          processor.disconnect();
          source.disconnect();
          stream.getTracks().forEach(track => track.stop());
          audioContext.close();
        } catch (e) {
          console.warn('清理测试资源时出错:', e);
        }
        setIsTestingMic(false);
        setTestMicLevel(0);
      }, 5000);
      
    } catch (err) {
      console.error('麦克风测试失败:', err);
      setErrorMessage('麦克风测试失败: ' + err.message);
      setIsTestingMic(false);
      setTestMicLevel(0);
    }
  };

  // 切换录音状态
  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // 清空结果
  const clearResult = () => {
    finalResultRef.current = '';
    interimResultRef.current = '';
    setResult('');
    setErrorMessage('');
  };

  return (
    <div className={`speech-recognition ${className}`}>
      <div className="speech-controls">
        <button
          type="button"
          className={`speech-button ${isListening ? 'listening' : ''} ${disabled ? 'disabled' : ''}`}
          onClick={toggleListening}
          disabled={disabled || isTestingMic}
        >
          {isListening ? '⏹️ 停止录音' : '🎤 语音输入'}
        </button>
        
        <button
          type="button"
          className="test-microphone-button"
          onClick={testMicrophone}
          disabled={isListening || isTestingMic}
        >
          {isTestingMic ? '测试中...' : '🔧 测试麦克风'}
        </button>
        
        {result && (
          <button
            type="button"
            className="clear-button"
            onClick={clearResult}
            title="清空结果"
            disabled={isListening}
          >
            🗑️
          </button>
        )}
      </div>
      
      {isListening && (
        <div className="audio-level-indicator">
          <div className="audio-level-label">
            🎤 音量: {audioLevel.toFixed(0)}% 
            {audioLevel > 5 ? ' 🔊' : audioLevel > 1 ? ' 🔉' : ' 🔈'}
          </div>
          <div className="audio-level-bar">
            <div 
              className="audio-level-fill" 
              style={{ 
                width: `${Math.min(audioLevel * 3, 100)}%`,
                backgroundColor: audioLevel > 10 ? '#4CAF50' : audioLevel > 5 ? '#FFC107' : '#FF5722'
              }}
            ></div>
          </div>
        </div>
      )}
      
      {isTestingMic && (
        <div className="audio-level-indicator test-mic-indicator">
          <div className="audio-level-label">
            🔧 测试麦克风: {testMicLevel.toFixed(0)}% 
            {testMicLevel > 5 ? ' 🔊' : testMicLevel > 1 ? ' 🔉' : ' 🔈'}
          </div>
          <div className="audio-level-bar">
            <div 
              className="audio-level-fill" 
              style={{ 
                width: `${Math.min(testMicLevel * 3, 100)}%`,
                backgroundColor: testMicLevel > 10 ? '#4CAF50' : testMicLevel > 5 ? '#FFC107' : '#FF5722'
              }}
            ></div>
          </div>
        </div>
      )}
      
      {errorMessage && (
        <div className="speech-error">
          <span>{errorMessage}</span>
          <button 
            type="button" 
            className="clear-error-btn"
            onClick={() => setErrorMessage('')}
          >
            ✕
          </button>
        </div>
      )}
        
        {/* 识别结果框 - 仅用于界面预览，不会传递给父组件 */}
        {result && (
          <div className="speech-result">
            <div className="result-label">识别预览：</div>
            <div className="result-text">{result}</div>
            <div className="result-note">（预览内容，停止录音后才会填入输入框）</div>
          </div>
        )}
        
        {isListening && (
        <div className="voice-recording-indicator">
          正在录音...请继续说话 (请点击停止按钮结束录音)
        </div>
      )}
      
      <div className="speech-tips">
        <p>💡 使用提示：</p>
        <ul>
          <li>请确保麦克风权限已开启</li>
          <li>建议在安静环境中使用，效果更佳</li>
          <li>支持中文普通话识别</li>
          <li>请点击停止按钮手动结束录音</li>
        </ul>
      </div>
    </div>
  );
};

export default SpeechRecognition;