import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Pie } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js'

// 注册Chart.js组件
ChartJS.register(ArcElement, Tooltip, Legend)

function ItineraryDetailPage() {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [itinerary, setItinerary] = useState(null)
  const [activeDay, setActiveDay] = useState(1)
  const navigate = useNavigate()

  // 模拟从API获取行程数据
  useEffect(() => {
    // 模拟加载延迟
    setTimeout(() => {
      // 模拟行程数据
      const mockItinerary = {
        id: id,
        destination: '日本东京',
        totalDays: 5,
        budget: '10000元',
        travelers: 2,
        preferences: '美食、动漫、购物',
        createdAt: '2024-06-10',
        days: [
          {
            day: 1,
            title: '抵达东京',
            activities: [
              {
                time: '上午',
                activity: '抵达成田国际机场',
                details: '预计10:00抵达，办理入境手续'
              },
              {
                time: '中午',
                activity: '机场到市区交通',
                details: '乘坐机场快线到东京站，约60分钟'
              },
              {
                time: '下午',
                activity: '酒店入住',
                details: '东京市中心酒店，地址：东京都千代田区'
              },
              {
                time: '晚上',
                activity: '东京塔夜景',
                details: '晚餐：六本木Hills附近餐厅，推荐寿司'
              }
            ]
          },
          {
            day: 2,
            title: '东京市中心一日游',
            activities: [
              {
                time: '上午',
                activity: '浅草寺',
                details: '东京最古老的寺庙，可品尝附近小吃'
              },
              {
                time: '中午',
                activity: '午餐',
                details: '浅草附近的天妇罗专卖店'
              },
              {
                time: '下午',
                activity: '秋叶原电器街',
                details: '动漫和电子产品购物天堂'
              },
              {
                time: '晚上',
                activity: '晚餐和购物',
                details: '银座购物区，晚餐推荐高级寿司店'
              }
            ]
          },
          {
            day: 3,
            title: '迪士尼乐园一日游',
            activities: [
              {
                time: '全天',
                activity: '东京迪士尼乐园',
                details: '建议早上8点到达，晚上9点观看烟花表演'
              }
            ]
          },
          {
            day: 4,
            title: '涩谷与新宿',
            activities: [
              {
                time: '上午',
                activity: '涩谷十字路口',
                details: '世界最繁忙的十字路口，参观忠犬八公像'
              },
              {
                time: '中午',
                activity: '涩谷109购物',
                details: '年轻人流行服饰购物中心'
              },
              {
                time: '下午',
                activity: '新宿御苑',
                details: '传统日式庭园和西式花园的结合'
              },
              {
                time: '晚上',
                activity: '新宿歌舞伎町',
                details: '东京夜生活区，晚餐推荐烤鸡肉串'
              }
            ]
          },
          {
            day: 5,
            title: '返程',
            activities: [
              {
                time: '上午',
                activity: '最后的购物',
                details: '机场免税店购物'
              },
              {
                time: '中午',
                activity: '前往机场',
                details: '建议提前3小时到达机场'
              },
              {
                time: '下午',
                activity: '办理登机手续',
                details: '搭乘返程航班'
              }
            ]
          }
        ],
        budgetBreakdown: [
          { name: '住宿', value: 3000 },
          { name: '餐饮', value: 2000 },
          { name: '交通', value: 1500 },
          { name: '门票', value: 1000 },
          { name: '购物', value: 2000 },
          { name: '其他', value: 500 }
        ]
      }
      
      setItinerary(mockItinerary)
      setLoading(false)
    }, 1500)
  }, [id])

  // 处理保存行程
  const handleSaveItinerary = () => {
    // 模拟保存操作
    alert('行程已保存到您的账户！')
  }

  // 渲染预算饼图
  const renderBudgetChart = () => {
    const data = {
      labels: itinerary.budgetBreakdown.map(item => item.name),
      datasets: [
        {
          data: itinerary.budgetBreakdown.map(item => item.value),
          backgroundColor: [
            '#FF6384',
            '#36A2EB',
            '#FFCE56',
            '#4BC0C0',
            '#9966FF',
            '#FF9F40'
          ],
          borderWidth: 1
        }
      ]
    }

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right'
        },
        title: {
          display: true,
          text: '预算分配'
        }
      }
    }

    return <Pie data={data} options={options} />
  }

  if (loading) {
    return <div className="loading-spinner">加载行程中...</div>
  }

  if (!itinerary) {
    return <div>未找到行程信息</div>
  }

  return (
    <div className="itinerary-detail-page">
      <div className="card mb-3">
        <h2>{itinerary.destination} {itinerary.totalDays}日游</h2>
        <div className="input-group">
          <div>
            <strong>预算:</strong> {itinerary.budget}
          </div>
          <div>
            <strong>人数:</strong> {itinerary.travelers}人
          </div>
          <div>
            <strong>偏好:</strong> {itinerary.preferences}
          </div>
          <div>
            <strong>创建日期:</strong> {itinerary.createdAt}
          </div>
        </div>
        <button className="mt-2" onClick={handleSaveItinerary}>保存行程</button>
      </div>

      {/* 行程天数选择器 */}
      <div className="card mb-3">
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {Array.from({ length: itinerary.totalDays }, (_, index) => index + 1).map(day => (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: activeDay === day ? 'var(--primary-color)' : '#e0e0e0',
                color: activeDay === day ? 'white' : 'var(--text-primary)',
                cursor: 'pointer'
              }}
            >
              第{day}天
            </button>
          ))}
        </div>
      </div>

      {/* 当日行程详情 */}
      <div className="card">
        <div className="day-header">
          {itinerary.days[activeDay - 1].title}
        </div>
        
        <div className="activities-list">
          {itinerary.days[activeDay - 1].activities.map((activity, index) => (
            <div key={index} className="card mb-2">
              <div style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>
                {activity.time}
              </div>
              <div style={{ margin: '0.5rem 0' }}>
                <strong>{activity.activity}</strong>
              </div>
              <div style={{ color: 'var(--text-secondary)' }}>
                {activity.details}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 预算分析部分 */}
      <div className="budget-section mt-3">
        <h3>预算分析</h3>
        <div className="budget-chart">
          {renderBudgetChart()}
        </div>
      </div>
    </div>
  )
}

export default ItineraryDetailPage