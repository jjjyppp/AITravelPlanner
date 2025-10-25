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
  const audioBufferRef = useRef([]); // 音频缓冲区
  const sendTimerRef = useRef(null); // 发送定时器
  const silenceTimerRef = useRef(null); // 静音检测定时器
  const lastAudioTimeRef = useRef(0); // 上次检测到音频的时间
  
  const speechServiceRef = useRef(new XunfeiSpeechService());

  // ==========================================
  // 讯飞API凭证
  // ==========================================
  const XF_CONFIG = {
    appId: 'f7ae70c1',
    apiKey: '557206bc97aa567d51c22e37e2faa9b2',
    apiSecret: 'NTdmOGIyNjU3MWNkYzQzOGNmNWFjZGNi'
  };

  // 设置语音服务回调
  useEffect(() => {
    speechServiceRef.current.setCallbacks({
      onMessage: (data) => {
        try {
          // 检查是否是结束帧
          if (XunfeiSpeechService.isEndFrame(data)) {
            stopListening();
            onResult && onResult(resultRef.current, true);
            return;
          }
          
          // 处理识别结果
          const recognitionResult = XunfeiSpeechService.processRecognitionResult(data);
          if (recognitionResult) {
            resultRef.current = recognitionResult;
            setResult(recognitionResult);
            onResult && onResult(recognitionResult, true);
          }
        } catch (err) {
          console.error('讯飞识别错误:', err.message);
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
      },
      onClose: () => {
        // 只在非主动停止时调用onStop
        if (!isStoppingRef.current) {
          stopListening();
        }
      }
    });

    // 组件卸载时清理
    return () => {
      stopListening();
    };
  }, [onResult, onError]);

  // 开始录音
  const startListening = async () => {
    if (disabled) {
      return;
    }

    try {
      setErrorMessage('');
      setResult('');
      resultRef.current = '';
      isStoppingRef.current = false;
      audioBufferRef.current = [];
      lastAudioTimeRef.current = Date.now();
      
      // 清理之前的定时器
      if (sendTimerRef.current) {
        clearInterval(sendTimerRef.current);
        sendTimerRef.current = null;
      }
      
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      
      // 先获取用户媒体权限
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
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
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
      audioProcessorRef.current.onaudioprocess = (e) => {
        if (!isStoppingRef.current && speechServiceRef.current.isConnected) {
          const inputData = e.inputBuffer.getChannelData(0);
          
          // 检查音频输入强度
          let maxAmplitude = 0;
          for (let i = 0; i < inputData.length; i++) {
            const amplitude = Math.abs(inputData[i]);
            maxAmplitude = Math.max(maxAmplitude, amplitude);
          }
          
          // 更新音频强度显示
          setAudioLevel(maxAmplitude * 100);
          
          // 检查是否有音频输入
          if (maxAmplitude > 0.01) { // 有音频输入
            lastAudioTimeRef.current = Date.now();
            
            // 清除静音定时器
            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = null;
            }
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
      
      // 连接讯飞服务
      await speechServiceRef.current.connect(XF_CONFIG);
      
      // 发送第一帧
      speechServiceRef.current.sendInitialFrame();
      
      // 启动定时发送音频数据
      startSendingAudio();
      
      // 启动静音检测
      startSilenceDetection();
      
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
      if (audioBufferRef.current.length >= 1280) { // 40ms数据
        // 取出一帧数据
        const frameData = audioBufferRef.current.splice(0, 1280);
        
        // 转换为字节数组
        const bytes = new Uint8Array(new Int16Array(frameData).buffer);
        
        // 编码为base64
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64Data = btoa(binary);
        
        // 发送音频数据
        speechServiceRef.current.sendAudioData(base64Data);
      }
    }, 40); // 每40ms发送一次
  };

  // 启动静音检测
  const startSilenceDetection = () => {
    // 每秒检查一次是否长时间没有音频输入
    silenceTimerRef.current = setInterval(() => {
      const now = Date.now();
      const timeSinceLastAudio = now - lastAudioTimeRef.current;
      
      // 如果超过5秒没有音频输入，则停止录音
      if (timeSinceLastAudio > 5000 && isListening) {
        stopListening();
      }
    }, 1000);
  };

  // 停止录音
  const stopListening = () => {
    isStoppingRef.current = true;
    
    // 清理定时器
    if (sendTimerRef.current) {
      clearInterval(sendTimerRef.current);
      sendTimerRef.current = null;
    }
    
    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    
    // 发送剩余的音频数据
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
    speechServiceRef.current.sendEndFrame();
    
    // 断开音频处理器连接
    if (audioProcessorRef.current) {
      audioProcessorRef.current.disconnect();
      audioProcessorRef.current = null;
    }
    
    // 断开音频源连接
    if (audioSourceRef.current) {
      audioSourceRef.current.disconnect();
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
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    setIsListening(false);
  };

  // 测试麦克风
  const testMicrophone = async () => {
    try {
      setIsTestingMic(true);
      setTestMicLevel(0);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1
        } 
      });
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000
      });
      
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
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
        processor.disconnect();
        source.disconnect();
        stream.getTracks().forEach(track => track.stop());
        audioContext.close();
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
          disabled={disabled}
        >
          {isListening ? '⏹️ 停止录音' : '🎤 语音输入(讯飞)'}
        </button>
        <button
          type="button"
          className="test-microphone-button"
          onClick={testMicrophone}
          disabled={isListening}
        >
          🔧 测试麦克风
        </button>
        
        {result && (
          <button
            type="button"
            className="clear-button"
            onClick={clearResult}
            title="清空结果"
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
          {errorMessage}
          <button 
            type="button" 
            className="clear-error-btn"
            onClick={() => setErrorMessage('')}
          >
            ✕
          </button>
        </div>
      )}
      
      {result && (
        <div className="speech-result">
          <div className="result-label">识别结果：</div>
          <div className="result-text">{result}</div>
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
        </ul>
      </div>
    </div>
  );
};

export default SpeechRecognition;