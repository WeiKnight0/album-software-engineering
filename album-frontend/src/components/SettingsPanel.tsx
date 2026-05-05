import React from 'react';
import { SettingOutlined, InfoCircleOutlined } from '@ant-design/icons';

const SettingsPanel: React.FC = () => {
  return (
    <div className="biophilic-card" style={{ padding: 40, maxWidth: 800 }}>
      <h2 style={{ color: '#3D5A40', fontSize: 24, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
        <SettingOutlined /> 设置
      </h2>
      <div style={{ color: '#6B5B4F', lineHeight: 1.8 }}>
        <p>设置功能开发中，敬请期待后续版本。</p>
        <div style={{ padding: 20, background: 'rgba(168,198,160,0.1)', borderRadius: 12, marginTop: 20 }}>
          <InfoCircleOutlined style={{ color: '#7D9B76', marginRight: 8 }} />
          更多设置项将在后续版本推出
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
