// src/services/xunfeiSpeechService.js
class XunfeiSpeechService {
  constructor() {
    this.websocket = null;
    this.isConnected = false;
    this.sequence = 0;
    this.onMessage = null;
    this.onError = null;
    this.onClose = null;
    this.appId = null; // 保存appId
  }

  // 设置回调函数
  setCallbacks({ onMessage, onError, onClose }) {
    this.onMessage = onMessage;
    this.onError = onError;
    this.onClose = onClose;
  }

  // 生成RFC1123格式的时间戳
  getRFC1123Date() {
    return new Date().toUTCString();
  }

  // 生成HMAC-SHA256签名
  async hmacSHA256(data, secret) {
    const encoder = new TextEncoder();
    const keyMaterial = encoder.encode(secret);

    return crypto.subtle.importKey(
      "raw",
      keyMaterial,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    ).then(key => {
      const dataBuffer = encoder.encode(data);
      return crypto.subtle.sign("HMAC", key, dataBuffer);
    }).then(signature => {
      return btoa(String.fromCharCode(...new Uint8Array(signature)));
    });
  }

  // 生成授权URL - 使用v1接口
  async generateAuthUrl(config) {
    try {
      const host = 'iat.xf-yun.com';
      const date = this.getRFC1123Date();

      // 构造signature原始字段
      const signatureOrigin = `host: ${host}\ndate: ${date}\nGET /v1 HTTP/1.1`;

      // 生成signature
      const signature = await this.hmacSHA256(signatureOrigin, config.apiSecret);

      // 构造authorization_origin
      const authorizationOrigin = `api_key="${config.apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;

      // base64编码authorization_origin
      const authorization = btoa(authorizationOrigin);

      // 构造最终URL - 使用v1接口参数格式
      const url = `wss://${host}/v1?authorization=${authorization}&date=${encodeURIComponent(date)}&host=${host}`;
      return url;
    } catch (err) {
      console.error('生成授权URL失败:', err);
      throw new Error('生成授权URL失败: ' + err.message);
    }
  }

  // 连接讯飞WebSocket服务
  connect(config) {
    return new Promise((resolve, reject) => {
      try {
        // 检查是否已配置凭证
        if (!config.appId || !config.apiKey || !config.apiSecret) {
          throw new Error('请先配置讯飞API凭证');
        }

        // 生成授权URL
        this.generateAuthUrl(config).then(url => {
          this.websocket = new WebSocket(url);
          this.sequence = 0;
          this.appId = config.appId; // 保存appId

          this.websocket.onopen = () => {
            resolve();
          };

          this.websocket.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              this.onMessage && this.onMessage(data);
            } catch (err) {
              console.error('解析讯飞返回数据失败:', err);
            }
          };

          this.websocket.onerror = (error) => {
            console.error('WebSocket错误:', error);
            this.onError && this.onError(error);
            reject(error);
          };

          this.websocket.onclose = () => {
            this.isConnected = false;
            this.onClose && this.onClose();
          };
        }).catch(err => {
          console.error('生成授权URL失败:', err);
          reject(err);
        });
      } catch (err) {
        console.error('连接讯飞服务失败:', err);
        this.onError && this.onError(err);
        reject(err);
      }
    });
  }

  // 发送初始帧 - 使用v1接口格式
  sendInitialFrame() {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.isConnected = true;
      this.sequence = 0;
      const frame = {
        header: {
          app_id: this.appId,
          status: 0 // 首帧
        },
        parameter: {
          iat: {
            // domain: "iat", // 改为通用听写模式，可能更稳定
            domain: "slm",
            language: "zh_cn",
            accent: "mandarin",
            eos: 60000, // API限制最大值60秒，但客户端已移除自动停止逻辑
            vinfo: 1,
            dwa: "wpgs",
            result: {
              encoding: "utf8",
              compress: "raw",
              format: "json"
            }
          }
        },
        payload: {
          audio: {
            encoding: "raw",
            sample_rate: 16000,
            channels: 1,
            bit_depth: 16,
            seq: 1, // 序号从1开始
            status: 0, // 首帧状态
            audio: ""
          }
        }
      };
      console.log('发送初始帧到讯飞服务');
      this.websocket.send(JSON.stringify(frame));
    }
  }

  // 发送音频数据
  sendAudioData(base64Data) {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.sequence++;
      const frame = {
        header: {
          app_id: this.appId,
          status: 1 // 中间帧
        },
        payload: {
          audio: {
            encoding: "raw",
            sample_rate: 16000,
            channels: 1,
            bit_depth: 16,
            seq: this.sequence, // 正确递增序号
            status: 1, // 中间帧状态
            audio: base64Data
          }
        }
      };
      this.websocket.send(JSON.stringify(frame));
    }
  }

  // 发送结束帧
  sendEndFrame() {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.sequence++;
      const frame = {
        header: {
          app_id: this.appId,
          status: 2 // 最后一帧
        },
        payload: {
          audio: {
            encoding: "raw",
            sample_rate: 16000,
            channels: 1,
            bit_depth: 16,
            seq: this.sequence, // 正确递增序号
            status: 2, // 最后一帧状态
            audio: "" // 结束帧数据为空
          }
        }
      };
      this.websocket.send(JSON.stringify(frame));
    }
  }

  // 关闭连接
  close() {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    this.isConnected = false;
  }

  // 处理识别结果
  static processRecognitionResult(data) {
    if (data.header && data.header.code !== 0) {
      throw new Error(data.header.message);
    }

    if (data.payload && data.payload.result && data.payload.result.text) {
      try {
        // 解码并解析结果
        const decodedText = atob(data.payload.result.text);
        const result = JSON.parse(decodedText);

        // 检查新的数据格式
        if (result.ws && Array.isArray(result.ws)) {
          let fullResult = '';
          result.ws.forEach(word => {
            if (word.cw && Array.isArray(word.cw) && word.cw[0] && word.cw[0].w) {
              fullResult += word.cw[0].w;
            }
          });

          if (fullResult) {
            // 正确解码UTF-8字节序列
            let decodedText = '';
            try {
              // 将字符串转换为UTF-8字节数组
              const bytes = new Uint8Array(fullResult.length);
              for (let i = 0; i < fullResult.length; i++) {
                bytes[i] = fullResult.charCodeAt(i) & 0xFF;
              }
              // 使用TextDecoder解码UTF-8
              const decoder = new TextDecoder('utf-8');
              decodedText = decoder.decode(bytes);
            } catch (e) {
              console.error('UTF-8解码失败:', e);
              decodedText = fullResult; // 如果解码失败，使用原始结果
            }

            return decodedText;
          }
        }
        // 兼容旧格式
        else if (result.cn && result.cn.st && result.cn.st.rt) {
          let fullResult = '';
          result.cn.st.rt.forEach(sentence => {
            if (sentence.ws) {
              sentence.ws.forEach(word => {
                if (word.cw && word.cw[0] && word.cw[0].w) {
                  fullResult += word.cw[0].w;
                }
              });
            }
          });

          if (fullResult) {
            // 正确解码UTF-8字节序列
            let decodedText = '';
            try {
              // 将字符串转换为UTF-8字节数组
              const bytes = new Uint8Array(fullResult.length);
              for (let i = 0; i < fullResult.length; i++) {
                bytes[i] = fullResult.charCodeAt(i) & 0xFF;
              }
              // 使用TextDecoder解码UTF-8
              const decoder = new TextDecoder('utf-8');
              decodedText = decoder.decode(bytes);
            } catch (e) {
              console.error('UTF-8解码失败:', e);
              decodedText = fullResult; // 如果解码失败，使用原始结果
            }

            return decodedText;
          }
        }
      } catch (err) {
        console.error('解析识别结果失败:', err);
        throw err;
      }
    }

    return null;
  }

  // 检查是否是结束帧
  static isEndFrame(data) {
    return data.header && data.header.status === 2;
  }
}

export default XunfeiSpeechService;