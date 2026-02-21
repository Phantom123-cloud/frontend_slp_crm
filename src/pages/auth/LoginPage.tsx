import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Checkbox, Card, message, Typography, Alert, Grid } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/auth';
import { useThemeStore } from '../../store/theme';

const { useBreakpoint } = Grid;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [sessionError, setSessionError] = useState('');
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { setAuth } = useAuthStore();
  const isDark = useThemeStore((s) => s.isDark);
  const screens = useBreakpoint();
  const isMobile = !screens.sm;

  const onFinish = async (values: { email: string; password: string; rememberMe: boolean }) => {
    setLoading(true);
    setSessionError('');
    try {
      const { data } = await authApi.login(values);
      setAuth(data.accessToken, data.refreshToken, data.user, data.permissions);
      message.success(t('common.success'));
      navigate('/users');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        setSessionError(err.response.data?.message || t('auth.sessionLimitError'));
      } else {
        message.error(t('auth.loginError'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: isDark ? '#0a0a0a' : '#e8eaed',
      padding: isMobile ? 16 : 0,
    }}>
      <Card style={{
        width: isMobile ? '100%' : 400,
        maxWidth: 400,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}>
        <Typography.Title level={isMobile ? 3 : 2} style={{ textAlign: 'center', marginBottom: 32 }}>
          SLP CRM
        </Typography.Title>
        {sessionError && (
          <Alert message={sessionError} type="warning" showIcon closable style={{ marginBottom: 16 }} onClose={() => setSessionError('')} />
        )}
        <Form onFinish={onFinish} initialValues={{ rememberMe: false }}>
          <Form.Item name="email" rules={[{ required: true, type: 'email', message: 'Email' }]}>
            <Input prefix={<UserOutlined />} placeholder={t('auth.email')} size="large" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: t('auth.password') }]}>
            <Input.Password prefix={<LockOutlined />} placeholder={t('auth.password')} size="large" />
          </Form.Item>
          <Form.Item name="rememberMe" valuePropName="checked">
            <Checkbox>{t('auth.rememberMe')}</Checkbox>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loading}>
              {t('auth.loginButton')}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
