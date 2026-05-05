import React, { useState, useEffect } from 'react';
import { Modal, Button, Radio, message, Spin } from 'antd';
import { CrownOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { paymentAPI } from '../services/api';

// [修改] 模拟支付弹窗组件：支持月卡/年卡套餐
interface PaymentModalProps {
  visible: boolean;
  userId: number;
  planType: 'monthly' | 'yearly';
  price: number;
  months: number;
  onClose: () => void;
  onSuccess: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ visible, userId, planType, price, months, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('mock');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [step, setStep] = useState<'create' | 'confirm' | 'success'>('create');

  useEffect(() => {
    if (visible) {
      setStep('create');
      setOrderId(null);
      setPaymentMethod('mock');
      setLoading(false);
    }
  }, [visible]);

  // [修改] 创建订单：使用传入的套餐价格和月数
  const handleCreateOrder = async () => {
    setLoading(true);
    try {
      const response = await paymentAPI.createOrder(userId, price, months);
      if (response.data.success) {
        setOrderId(response.data.data.orderId);
        setStep('confirm');
        message.success('订单创建成功');
      } else {
        message.error(response.data.message || '创建订单失败');
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '创建订单失败');
    } finally {
      setLoading(false);
    }
  };

  // [新增] 确认支付（模拟）
  const handleConfirmPayment = async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const response = await paymentAPI.confirmPayment(orderId);
      if (response.data.success) {
        setStep('success');
        message.success('🎉 支付成功，会员已开通！');
        onSuccess();
      } else {
        message.error(response.data.message || '支付失败');
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '支付失败');
    } finally {
      setLoading(false);
    }
  };

  // [新增] 关闭弹窗时重置状态
  const handleClose = () => {
    setStep('create');
    setOrderId(null);
    setPaymentMethod('mock');
    onClose();
  };

  return (
    <Modal
      open={visible}
      onCancel={handleClose}
      footer={null}
      width={480}
      className="biophilic-modal"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#3D5A40' }}>
          <CrownOutlined style={{ color: '#7D9B76' }} />
          <span>开通会员</span>
        </div>
      }
    >
      <div style={{ padding: '8px 0' }}>
        {/* [修改] 步骤1：创建订单 */}
        {step === 'create' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{ fontSize: 14, color: '#8B7355', marginBottom: 8 }}>
                {planType === 'monthly' ? '月度会员' : '年度会员'}
              </div>
              <div style={{ fontSize: 42, fontWeight: 700, color: '#3D5A40' }}>
                ¥{price / 100}<span style={{ fontSize: 16, fontWeight: 400, color: '#8B7355' }}> / {planType === 'monthly' ? '月' : '年'}</span>
              </div>
              <div style={{ fontSize: 13, color: '#7D9B76', marginTop: 4 }}>
                有效期：{months}个月
              </div>
              <div style={{ fontSize: 13, color: '#8B7355', marginTop: 8 }}>
                开通后立享 50GB 存储空间 + AI 智能搜索等专属权益
              </div>
            </div>

            {/* [新增] 支付方式选择 */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 14, color: '#5B7B5E', marginBottom: 12, fontWeight: 500 }}>
                选择支付方式
              </div>
              <Radio.Group
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{ width: '100%' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Radio value="mock">
                    <span style={{ color: '#3D5A40', fontSize: 14 }}>模拟支付（演示模式）</span>
                  </Radio>
                  <Radio value="wechat" disabled>
                    <span style={{ color: '#999', fontSize: 14 }}>微信支付（暂未接入）</span>
                  </Radio>
                  <Radio value="alipay" disabled>
                    <span style={{ color: '#999', fontSize: 14 }}>支付宝（暂未接入）</span>
                  </Radio>
                </div>
              </Radio.Group>
            </div>

            <Button
              type="primary"
              block
              size="large"
              loading={loading}
              onClick={handleCreateOrder}
              style={{
                background: 'linear-gradient(135deg, #7D9B76 0%, #5D7A56 100%)',
                border: 'none',
                height: 48,
                borderRadius: 12,
                fontSize: 16
              }}
            >
              立即支付 ¥{price / 100}
            </Button>
          </>
        )}

        {/* [修改] 步骤2：确认支付 */}
        {step === 'confirm' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{ fontSize: 14, color: '#8B7355', marginBottom: 16 }}>订单已创建</div>
              <div style={{
                padding: 16,
                background: 'rgba(125, 155, 118, 0.1)',
                borderRadius: 12,
                marginBottom: 16
              }}>
                <div style={{ fontSize: 13, color: '#8B7355' }}>订单号</div>
                <div style={{ fontSize: 14, color: '#3D5A40', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {orderId}
                </div>
                <div style={{ fontSize: 13, color: '#8B7355', marginTop: 8 }}>
                  {planType === 'monthly' ? '月度会员' : '年度会员'} · 有效期{months}个月
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#3D5A40', marginTop: 12 }}>
                  ¥{(price / 100).toFixed(2)}
                </div>
              </div>
              <div style={{ fontSize: 13, color: '#7D9B76' }}>
                <Spin size="small" style={{ marginRight: 8 }} />
                模拟支付环境：点击下方按钮确认支付
              </div>
            </div>

            <Button
              type="primary"
              block
              size="large"
              loading={loading}
              onClick={handleConfirmPayment}
              style={{
                background: 'linear-gradient(135deg, #7D9B76 0%, #5D7A56 100%)',
                border: 'none',
                height: 48,
                borderRadius: 12,
                fontSize: 16
              }}
            >
              确认支付
            </Button>
            <Button
              block
              style={{ marginTop: 12, borderRadius: 12, height: 44 }}
              onClick={handleClose}
            >
              取消
            </Button>
          </>
        )}

        {/* [修改] 步骤3：支付成功 */}
        {step === 'success' && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <CheckCircleOutlined style={{ fontSize: 64, color: '#7D9B76', marginBottom: 16 }} />
            <h3 style={{ color: '#3D5A40', fontSize: 22, marginBottom: 8 }}>支付成功！</h3>
            <p style={{ color: '#6B5B4F', fontSize: 14, marginBottom: 8 }}>
              恭喜你成为{planType === 'monthly' ? '月度' : '年度'}会员
            </p>
            <p style={{ color: '#8B7355', fontSize: 13, marginBottom: 24 }}>
              会员有效期：{months}个月 · 已解锁全部高级权益
            </p>
            <Button
              type="primary"
              block
              size="large"
              onClick={handleClose}
              style={{
                background: 'linear-gradient(135deg, #7D9B76 0%, #5D7A56 100%)',
                border: 'none',
                height: 48,
                borderRadius: 12,
                fontSize: 16
              }}
            >
              知道了
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default PaymentModal;
