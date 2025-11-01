import React, { useState } from 'react';
import { Container, Typography, Box, TextField, Button, Grid, Card, CardContent, Tabs, Tab, CircularProgress, Paper, Divider, Snackbar, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import LLMService from '../services/llmService';
import { useAuth } from '../contexts/AuthContext';
import { useItinerary } from '../contexts/ItineraryContext';
import './TravelPlanner.css';

/**
 * 旅行规划组件
 * 使用大语言模型生成行程规划和费用预算
 */
const TravelPlanner = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { saveItinerary } = useItinerary();
  
  // 状态管理
  const [activeTab, setActiveTab] = useState(0); // 0: 行程规划, 1: 预算估计
  const [isLoading, setIsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [result, setResult] = useState(`# 北京三日游行程规划

## 第一天：市区经典景点

### 上午
- **天安门广场** (08:00-09:30)
  感受中国的心脏地带，欣赏升旗仪式（如需观看请提前1-2小时到达）
- **故宫博物院** (10:00-13:00)
  参观世界上最大的古代宫殿建筑群，建议从午门进入，神武门离开

### 午餐
- **全聚德烤鸭店**（王府井店）
  品尝正宗北京烤鸭，建议提前预约

### 下午
- **景山公园** (14:30-16:00)
  登景山俯瞰故宫全景，是拍摄故宫的最佳位置
- **什刹海/南锣鼓巷** (16:30-19:00)
  漫步胡同，体验老北京风情，可乘坐三轮车游览

## 第二天：长城之旅

### 全天
- **八达岭长城** (08:00-16:00)
  乘坐S2线火车或旅游大巴前往，建议上午出发避开人流高峰
  游览时间约3-4小时，可选择缆车上下

### 晚餐
- **长城脚下的公社** 或返回市区品尝炸酱面

## 第三天：文化与科技

### 上午
- **颐和园** (09:00-12:00)
  游览皇家园林，乘船游览昆明湖

### 午餐
- **颐和园附近餐厅**

### 下午
- **798艺术区** (13:30-16:30)
  参观现代艺术展览和创意店铺
- **奥林匹克公园** (17:00-19:00)
  参观鸟巢、水立方等奥运场馆

## 交通建议
- 市内交通以地铁为主，购买一卡通更方便
- 长城一日游可选择正规旅游巴士或S2线火车

## 住宿推荐
- 市中心：王府井、前门附近，交通便利
- 特色住宿：四合院民宿，体验老北京生活

## 注意事项
- 故宫需提前在官网预约门票
- 长城游览建议穿舒适的鞋子
- 夏季注意防晒，冬季注意保暖`);
  const [progressResult, setProgressResult] = useState('');
  
  // 行程规划表单状态
  const [itineraryForm, setItineraryForm] = useState({
    destination: '',
    startDate: '',
    endDate: '',
    personCount: '',
    interests: '',
    budget: ''
  });
  
  // 预算估计表单状态
  const [budgetForm, setBudgetForm] = useState({
    destination: '',
    duration: '',
    personCount: '',
    travelSeason: '',
    accommodationLevel: ''
  });

  // 处理表单输入变化
  const handleItineraryFormChange = (e) => {
    const { name, value } = e.target;
    setItineraryForm(prev => ({ ...prev, [name]: value }));
  };

  const handleBudgetFormChange = (e) => {
    const { name, value } = e.target;
    setBudgetForm(prev => ({ ...prev, [name]: value }));
  };

  // 处理标签切换
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setResult('');
    setProgressResult('');
  };

  // 生成行程规划
  const generateItinerary = async () => {
    // 表单验证
    if (!itineraryForm.destination || !itineraryForm.startDate || !itineraryForm.endDate || 
        !itineraryForm.personCount || !itineraryForm.interests) {
      alert('请填写所有必填字段');
      return;
    }

    try {
      setIsLoading(true);
      setResult('');
      setProgressResult('');

      // 构建用户旅行需求文本
      const travelRequirements = `目的地: ${itineraryForm.destination}, 开始日期: ${itineraryForm.startDate}, 结束日期: ${itineraryForm.endDate}, 人数: ${itineraryForm.personCount}人, 兴趣偏好: ${itineraryForm.interests}${itineraryForm.budget ? `, 预算范围: ${itineraryForm.budget}` : ''}`;
      
      // 构建完整的提示词，要求详细的旅行规划内容
      const prompt = `请帮我生成一份详细的旅行规划，我的旅行需求为：${travelRequirements}

请务必包含以下详细信息：
1. 详细的每日行程安排，具体到时间段
2. 景点信息：每个推荐景点的介绍、开放时间、门票价格、游览建议
3. 住宿推荐：具体酒店名称、位置、价格区间、特色和预订建议
4. 餐厅推荐：具体餐厅名称、特色菜品、人均消费、位置
5. 交通详情：
   - 抵达目的地的大交通建议（飞机/火车等）
   - 当地交通详细方案，包括具体线路、票价、运营时间
   - 景点间的最优交通方式
6. 费用估算：各项花费的明细预算
7. 实用小贴士：当地习俗、天气注意事项、必备物品等

请使用结构化格式输出，内容要具体详细，便于实际旅行参考。`;
      
      // 调用LLMService的流式响应方法
      const fullResult = await LLMService.generateStreamResponse(prompt, (progress) => {
        setProgressResult(prev => prev + progress);
      });

      setResult(fullResult);
    } catch (error) {
      alert('生成行程规划失败: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 生成预算估计
  const estimateBudget = async () => {
    // 表单验证
    if (!budgetForm.destination || !budgetForm.duration || !budgetForm.personCount || 
        !budgetForm.travelSeason || !budgetForm.accommodationLevel) {
      alert('请填写所有必填字段');
      return;
    }

    try {
      setIsLoading(true);
      setResult('');
      setProgressResult('');

      const budgetInfo = {
        destination: budgetForm.destination,
        duration: budgetForm.duration,
        personCount: parseInt(budgetForm.personCount),
        travelSeason: budgetForm.travelSeason,
        accommodationLevel: budgetForm.accommodationLevel
      };

      // 使用流式响应
      const fullResult = await LLMService.estimateBudget(budgetInfo, (progress) => {
        setProgressResult(prev => prev + progress);
      });

      setResult(fullResult);
    } catch (error) {
      alert('生成预算估计失败: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 渲染行程规划表单
  const renderItineraryForm = () => (
    <Box component="form" noValidate autoComplete="off" sx={{ mt: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="目的地 *"
            name="destination"
            value={itineraryForm.destination}
            onChange={handleItineraryFormChange}
            required
            placeholder="例如：北京、上海、三亚"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="人数 *"
            name="personCount"
            type="number"
            value={itineraryForm.personCount}
            onChange={handleItineraryFormChange}
            required
            placeholder="例如：2、4"
            InputProps={{
              inputProps: {
                min: 1
              }
            }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="开始日期 *"
            name="startDate"
            type="date"
            value={itineraryForm.startDate}
            onChange={handleItineraryFormChange}
            required
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="结束日期 *"
            name="endDate"
            type="date"
            value={itineraryForm.endDate}
            onChange={handleItineraryFormChange}
            required
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="兴趣偏好 *"
            name="interests"
            value={itineraryForm.interests}
            onChange={handleItineraryFormChange}
            required
            placeholder="例如：历史文化、美食、自然风光、购物（用逗号分隔）"
            multiline
            rows={2}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="预算范围"
            name="budget"
            value={itineraryForm.budget}
            onChange={handleItineraryFormChange}
            placeholder="例如：5000元以内、10000-15000元（可选）"
          />
        </Grid>
      </Grid>
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Button 
          variant="contained" 
          onClick={generateItinerary}
          sx={{ 
            bgcolor: '#1976d2', 
            '&:hover': { bgcolor: '#1565c0' },
            py: 1.5,
            px: 6,
            fontSize: '1rem'
          }}
        >
          生成行程规划
        </Button>
      </Box>
    </Box>
  );

  // 渲染预算估计表单
  const renderBudgetForm = () => (
    <Box component="form" noValidate autoComplete="off" sx={{ mt: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="目的地 *"
            name="destination"
            value={budgetForm.destination}
            onChange={handleBudgetFormChange}
            required
            placeholder="例如：北京、上海、三亚"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="旅行天数 *"
            name="duration"
            value={budgetForm.duration}
            onChange={handleBudgetFormChange}
            required
            placeholder="例如：3天2晚、7天6晚"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="人数 *"
            name="personCount"
            type="number"
            value={budgetForm.personCount}
            onChange={handleBudgetFormChange}
            required
            placeholder="例如：2、4"
            InputProps={{
              inputProps: {
                min: 1
              }
            }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="旅行季节 *"
            name="travelSeason"
            value={budgetForm.travelSeason}
            onChange={handleBudgetFormChange}
            required
            placeholder="例如：春季、夏季、秋季、冬季、春节假期、暑假"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="住宿标准 *"
            name="accommodationLevel"
            value={budgetForm.accommodationLevel}
            onChange={handleBudgetFormChange}
            required
            placeholder="例如：经济型、舒适型、豪华型、五星级酒店"
          />
        </Grid>
      </Grid>
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Button 
          variant="contained" 
          onClick={estimateBudget}
          sx={{ 
            bgcolor: '#1976d2', 
            '&:hover': { bgcolor: '#1565c0' },
            py: 1.5,
            px: 6,
            fontSize: '1rem'
          }}
        >
          生成预算估计
        </Button>
      </Box>
    </Box>
  );

  // 格式化文本结果，增强可读性
  const formatResult = (text) => {
    if (!text) return '';
    
    // 替换Markdown风格的标题为加粗文本
    return text
      .replace(/^###\s+(.+)$/gm, '<h4 style="margin-top: 1.5em; margin-bottom: 0.5em; color: #1976d2;">$1</h4>')
      .replace(/^##\s+(.+)$/gm, '<h3 style="margin-top: 2em; margin-bottom: 0.75em; color: #1976d2;">$1</h3>')
      .replace(/^#\s+(.+)$/gm, '<h2 style="margin-top: 2em; margin-bottom: 1em; color: #1565c0; border-bottom: 2px solid #e3f2fd; padding-bottom: 0.3em;">$1</h2>')
      // 替换无序列表
      .replace(/^-\s+(.+)$/gm, '<li style="margin-bottom: 0.5em;">$1</li>')
      .replace(/(<li[^>]*>.*?<\/li>)+/gs, '<ul style="margin-top: 0.5em; margin-bottom: 1em; padding-left: 1.5em;">$&</ul>')
      // 替换有序列表
      .replace(/^(\d+)\.\s+(.+)$/gm, '<li style="margin-bottom: 0.5em;">$2</li>')
      .replace(/(<li[^>]*>.*?<\/li>)+/gs, function(match) {
        if (match.includes('ol>')) return match;
        return '<ol style="margin-top: 0.5em; margin-bottom: 1em; padding-left: 1.5em;">' + match + '</ol>';
      })
      // 加粗文本
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // 斜体文本
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // 添加段落分隔
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/^(.*?)$/m, '<p>$1</p>');
  };
  
  // 复制结果到剪贴板
  const copyToClipboard = () => {
    const textToCopy = result || progressResult;
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        alert('已复制到剪贴板');
      })
      .catch(err => {
        console.error('复制失败:', err);
      });
  };
  
  // 保存行程
  const handleSaveItinerary = async () => {
    // 检查用户登录状态
    if (!user) {
      navigate('/login');
      return;
    }
    
    setSaving(true);
    try {
      // 从结果中提取标题
      const titleMatch = result.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : `${itineraryForm.destination || '未知目的地'}旅行计划`;
      
      // 准备行程数据
      const itineraryData = {
        title: title,
        destination: itineraryForm.destination || '未指定',
        start_date: itineraryForm.startDate || '未指定',
        end_date: itineraryForm.endDate || '未指定',
        person_count: itineraryForm.personCount || 1,
        budget: itineraryForm.budget || '未指定',
        interests: itineraryForm.interests ? itineraryForm.interests.split(',').map(p => p.trim()) : [],
        content: result,
        trip_info: itineraryForm
      };
      
      const saveResult = await saveItinerary(itineraryData);
      if (saveResult.success) {
        setShowSaveSuccess(true);
      } else {
        alert('保存失败：' + saveResult.error);
      }
    } catch (error) {
      console.error('保存行程失败:', error);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };
  
  // 处理保存成功提示关闭
  const handleCloseSuccess = () => {
    setShowSaveSuccess(false);
  };

  // 渲染结果区域
  const renderResult = () => (
    <Box sx={{ mt: 6 }}>
      <Divider sx={{ mb: 2 }}>
        <Typography variant="h6" color="text.secondary">{activeTab === 0 ? '行程规划结果' : '预算估计结果'}</Typography>
      </Divider>
      
      {(result || progressResult) && (
        <Paper elevation={3} sx={{ p: 3, bgcolor: '#ffffff', borderRadius: 2, border: '1px solid #e0e0e0' }}>
          {/* 操作按钮 */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2, gap: 2 }}>
            <Button 
              variant="contained" 
              size="small" 
              onClick={handleSaveItinerary}
              disabled={saving || activeTab !== 0}
              sx={{ 
                bgcolor: '#1976d2', 
                '&:hover': { bgcolor: '#1565c0' },
                '&.Mui-disabled': { 
                  bgcolor: '#e3f2fd',
                  color: '#90caf9'
                }
              }}
            >
              {saving ? '保存中...' : '保存行程'}
            </Button>
            <Button 
              variant="outlined" 
              size="small" 
              onClick={copyToClipboard}
              sx={{ 
                borderColor: '#1976d2', 
                color: '#1976d2',
                '&:hover': { 
                  borderColor: '#1565c0',
                  bgcolor: 'rgba(25, 118, 210, 0.04)'
                }
              }}
            >
              复制结果
            </Button>
          </Box>
          
          {/* 结果内容 */}
          <div 
            className="result-content"
            dangerouslySetInnerHTML={{ __html: formatResult(isLoading ? progressResult : result) }}
          />
          
          {isLoading && <span className="typing-cursor">|</span>}
        </Paper>
      )}
      
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress color="primary" />
          <Typography variant="body2" sx={{ ml: 2, mt: 1 }}>
            正在生成{activeTab === 0 ? '行程规划' : '预算估计'}...
          </Typography>
        </Box>
      )}
    </Box>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Card elevation={0} sx={{ overflow: 'hidden', borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ bgcolor: '#fafafa', p: 3, borderBottom: '1px solid #e0e0e0' }}>
            <Typography variant="h4" align="center" gutterBottom>
              AI 旅行规划助手
            </Typography>
            <Typography variant="body1" align="center" color="text.secondary">
              使用先进的大语言模型为您生成个性化的旅行方案和费用预算
            </Typography>
          </Box>
          
          <Box sx={{ p: 4 }}>
            {/* 选项卡 */}
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{
                mb: 4,
                '& .MuiTab-root': {
                  py: 2,
                  fontSize: '1rem',
                },
                '& .Mui-selected': {
                  fontWeight: 'bold',
                }
              }}
            >
              <Tab label="行程规划" />
              <Tab label="预算估计" />
            </Tabs>
            
            {/* 表单内容 */}
            {activeTab === 0 ? renderItineraryForm() : renderBudgetForm()}
            
            {/* 结果显示 */}
            {renderResult()}
          </Box>
        </CardContent>
      </Card>
      
      {/* 保存成功提示 */}
      <Snackbar
        open={showSaveSuccess}
        autoHideDuration={3000}
        onClose={handleCloseSuccess}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={handleCloseSuccess} sx={{ width: '100%' }}>
          ✓ 行程保存成功！可在"我的行程"中查看
        </Alert>
      </Snackbar>
    </Container>
);
}

export default TravelPlanner;