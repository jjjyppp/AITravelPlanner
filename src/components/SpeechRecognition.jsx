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
  const [result, setResult] = useState('');
  
  const audioContextRef = useRef(null);
  const isStoppingRef = useRef(false);
  const audioProcessorRef = useRef(null);
  const audioSourceRef = useRef(null);
  const streamRef = useRef(null);
  const resultRef = useRef('');
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
          if (XunfeiSpeechService.isEndFrame(data)) {
            stopListening();
            onResult && onResult(resultRef.current, true);
            return;
          }
          
          const recognitionResult = XunfeiSpeechService.processRecognitionResult(data);
          if (recognitionResult) {
            resultRef.current = recognitionResult;
            setResult(recognitionResult);
            onResult && onResult(recognitionResult, false);
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
        stopListening();
      },
      onClose: () => {
        if (!isStoppingRef.current) {
          console.log('WebSocket连接关闭');
          stopListening();
        }
      }
    });
  }, [onResult, onError]);

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
      resultRef.current = '';
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
      stopListening();
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

  // 启动智能静音检测
  const startSmartSilenceDetection = () => {
    silenceTimerRef.current = setInterval(() => {
      if (!isListening) return;
      
      const now = Date.now();
      const timeSinceLastAudio = now - lastAudioTimeRef.current;
      const totalSessionTime = now - sessionStartTimeRef.current;
      
      console.log('智能静音检测 - 会话时长:', Math.round(totalSessionTime/1000), '秒, 静音时长:', Math.round(timeSinceLastAudio/1000), '秒');
      
      // 5秒静音检测
      if (timeSinceLastAudio > 5000) {
        console.log('检测到5秒静音，停止录音');
        stopListening();
      }
      // 5分钟最大限制（保护机制）
      else if (totalSessionTime > 300000) {
        console.log('达到最大录音时长限制，停止录音');
        stopListening();
      }
    }, 1000);
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
    
    // 重置状态
    setTimeout(() => {
      isStoppingRef.current = false;
    }, 100);
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
    resultRef.current = '';
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
          {isListening ? '⏹️ 停止录音' : '🎤 语音输入(讯飞)'}
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
      

      
      {isListening && (
        <div className="voice-recording-indicator">
          正在录音...请继续说话 (检测到静音5秒后自动停止)
        </div>
      )}
      
      <div className="speech-tips">
        <p>💡 使用提示：</p>
        <ul>
          <li>请确保麦克风权限已开启</li>
          <li>建议在安静环境中使用，效果更佳</li>
          <li>支持中文普通话识别</li>
          <li>检测到静音5秒后自动停止录音</li>
          <li>最长可连续录音5分钟</li>
        </ul>
      </div>
    </div>
  );
};

export default SpeechRecognition;
