import React, { useState, useEffect } from 'react';
import { CheckOutlined } from '@ant-design/icons';
import PaymentModal from './PaymentModal';  // [新增] 支付弹窗
import { paymentAPI } from '../services/api';  // [新增] 支付API

// [修改] 会员权益页面组件：接入支付弹窗
interface MembershipProps {
  userId: number;
  isMember?: boolean;
  onMembershipUpdated?: () => void;
}

const Membership: React.FC<MembershipProps> = ({ userId, isMember, onMembershipUpdated }) => {
  const [paymentVisible, setPaymentVisible] = useState(false);  // [新增] 控制支付弹窗显示
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly'); // [新增] 默认选中月卡
  const [currentOrder, setCurrentOrder] = useState<any>(null);  // [新增] 用户当前套餐订单

  // [新增] 加载用户最近一笔已支付订单，判断当前套餐类型
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await paymentAPI.getLatestOrder(userId);
        if (response.data.success && response.data.data) {
          setCurrentOrder(response.data.data);
        }
      } catch (error) {
        console.error('获取订单失败:', error);
      }
    };
    fetchOrder();
  }, [userId]);

  // [修改] 根据订单的创建时间和过期时间差，推断当前套餐类型（月卡/年卡）
  const getPlanTypeFromOrder = (order: any): 'monthly' | 'yearly' | null => {
    if (!order?.createdAt || !order?.expireAt) return null;
    const created = new Date(order.createdAt);
    const expire = new Date(order.expireAt);
    const diffMonths = (expire.getFullYear() - created.getFullYear()) * 12 + (expire.getMonth() - created.getMonth());
    return diffMonths >= 10 ? 'yearly' : 'monthly';
  };

  const currentPlanType = getPlanTypeFromOrder(currentOrder);
  const isCurrentPlan = currentOrder?.status === 'PAID' && currentPlanType === selectedPlan;
  return (
    <div>
      {/* [新增] 页面标题区域 */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <h2 className="biophilic-title" style={{ fontSize: 32, marginBottom: 12, color: '#3D5A40' }}>
          选择适合你的计划
        </h2>
        <p style={{ color: '#6B5B4F', fontSize: 16 }}>
          升级会员，解锁更多智能功能，让回忆管理更高效
        </p>
      </div>

      {/* [新增] 双卡片容器 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 32,
        maxWidth: 960,
        margin: '0 auto'
      }}>
        {/* [新增] 普通用户卡片 */}
        <div className="biophilic-card" style={{ padding: 40, display: 'flex', flexDirection: 'column' }}>
          {/* 标题 */}
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 28, margin: '0 0 8px', fontWeight: 600, color: '#3D5A40' }}>
              普通用户
            </h3>
            <p style={{ fontSize: 14, margin: 0, color: '#8B7355' }}>
              日常使用
            </p>
          </div>

          {/* 价格 */}
          <div style={{ marginBottom: 32 }}>
            <span style={{ fontSize: 48, fontWeight: 700, color: '#3D5A40' }}>免费</span>
          </div>

          {/* 按钮 */}
          <button
            disabled
            style={{
              width: '100%',
              padding: '14px 24px',
              borderRadius: 12,
              border: 'none',
              fontSize: 16,
              fontWeight: 500,
              cursor: 'default',
              marginBottom: 32,
              background: isMember ? 'rgba(125, 155, 118, 0.08)' : 'rgba(125, 155, 118, 0.15)',
              color: isMember ? '#A8C6A0' : '#5B7B5E'
            }}
          >
            {isMember ? '已升级会员' : '当前计划'}
          </button>

          {/* 权益列表 */}
          <div style={{ flex: 1 }}>
            <FeatureItem text="免费存储额度（1GB）" variant="dark" />
            <FeatureItem text="基础照片搜索功能" variant="dark" />
            <FeatureItem text="照片上传与管理" variant="dark" />
            {/* [留白] 普通用户后续填写权益 */}
            <FeatureItem text="" variant="dark" />
            {/* [留白] 普通用户后续填写权益 */}
            <FeatureItem text="" variant="dark" />
            {/* [留白] 普通用户后续填写权益 */}
            <FeatureItem text="" variant="dark" />
          </div>
        </div>

        {/* [新增] 会员用户卡片（绿色渐变突出显示） */}
        <div className="biophilic-card" style={{
          padding: 40,
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #7D9B76 0%, #5D7A56 100%)',
          color: 'white',
          transform: 'scale(1.02)',
          boxShadow: '0 8px 32px rgba(93, 122, 86, 0.3)'
        }}>
          {/* 标题 */}
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 28, margin: '0 0 8px', fontWeight: 600, color: 'white' }}>
              会员用户
            </h3>
            <p style={{ fontSize: 14, margin: 0, color: 'rgba(255,255,255,0.8)' }}>
              效率升级
            </p>
          </div>

          {/* [修改] 月卡/年卡切换 */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button
              onClick={() => setSelectedPlan('monthly')}
              style={{
                flex: 1,
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                fontSize: 14,
                cursor: 'pointer',
                background: selectedPlan === 'monthly' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
                color: 'white',
                fontWeight: selectedPlan === 'monthly' ? 600 : 400,
                transition: 'all 0.3s ease'
              }}
            >
              月卡
            </button>
            <button
              onClick={() => setSelectedPlan('yearly')}
              style={{
                flex: 1,
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                fontSize: 14,
                cursor: 'pointer',
                background: selectedPlan === 'yearly' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
                color: 'white',
                fontWeight: selectedPlan === 'yearly' ? 600 : 400,
                transition: 'all 0.3s ease'
              }}
            >
              年卡
            </button>
          </div>

          {/* [修改] 套餐价格与有效期 */}
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 42, fontWeight: 700, color: 'white' }}>
              {selectedPlan === 'monthly' ? '¥20' : '¥198'}
            </span>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>
              {selectedPlan === 'monthly' ? ' / 月' : ' / 年'}
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 24 }}>
            有效期：{selectedPlan === 'monthly' ? '1个月' : '12个月'}
            {selectedPlan === 'yearly' && <span>（相当于 ¥16.5/月，省 ¥42）</span>}
          </div>

          {/* [修改] 按钮：根据是否当前套餐显示不同文案和样式 */}
          <button
            disabled={isCurrentPlan}
            style={{
              width: '100%',
              padding: '14px 24px',
              borderRadius: 12,
              border: 'none',
              fontSize: 16,
              fontWeight: 500,
              cursor: isCurrentPlan ? 'default' : 'pointer',
              marginBottom: 32,
              background: isCurrentPlan ? 'rgba(255,255,255,0.2)' : 'white',
              color: isCurrentPlan ? 'rgba(255,255,255,0.9)' : '#5D7A56',
              transition: 'all 0.3s ease'
            }}
            onClick={() => !isCurrentPlan && setPaymentVisible(true)}
            onMouseEnter={(e) => {
              if (isCurrentPlan) return;
              e.currentTarget.style.background = '#f0f0f0';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              if (isCurrentPlan) return;
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {isCurrentPlan ? '当前套餐' : '立即订阅'}
          </button>

          {/* [修改] 模拟支付弹窗：传入套餐信息 */}
          <PaymentModal
            visible={paymentVisible}
            userId={userId}
            planType={selectedPlan}
            price={selectedPlan === 'monthly' ? 2000 : 19800}
            months={selectedPlan === 'monthly' ? 1 : 12}
            onClose={() => setPaymentVisible(false)}
            onSuccess={() => {
              setPaymentVisible(false);
              onMembershipUpdated?.();
            }}
          />

          {/* 权益列表 */}
          <div style={{ flex: 1 }}>
            <FeatureItem text="AI 智能搜索" variant="light" />
            <FeatureItem text="超大存储空间（50GB）" variant="light" />
            <FeatureItem text="角色识别功能" variant="light" />
            <FeatureItem text="高级数据统计" variant="light" />
            <FeatureItem text="优先客服支持" variant="light" />
            <FeatureItem text="专属会员标识" variant="light" />
          </div>
        </div>
      </div>
    </div>
  );
};

// [新增] 权益列表单项组件
interface FeatureItemProps {
  text: string;
  variant: 'light' | 'dark';
}

const FeatureItem: React.FC<FeatureItemProps> = ({ text, variant }) => {
  // [留白] 空文本时渲染占位高度，保持列表对齐
  if (!text) {
    return <div style={{ height: 46 }} />;
  }

  const isLight = variant === 'light';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 0',
      borderBottom: '1px solid rgba(168, 198, 160, 0.2)'
    }}>
      <span style={{
        width: 20,
        height: 20,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isLight ? 'rgba(255,255,255,0.2)' : 'rgba(125, 155, 118, 0.15)',
        color: isLight ? 'white' : '#5D7A56',
        fontSize: 12,
        flexShrink: 0
      }}>
        <CheckOutlined />
      </span>
      <span style={{
        fontSize: 14,
        color: isLight ? 'rgba(255,255,255,0.95)' : '#3D5A40'
      }}>
        {text}
      </span>
    </div>
  );
};

export default Membership;
