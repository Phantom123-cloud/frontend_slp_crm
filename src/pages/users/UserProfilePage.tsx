import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Tabs, Card, Form, Input, InputNumber, Select, DatePicker, Button,
  Space, Tag, message, Typography, List, Modal, Upload, Descriptions, Badge, Grid,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, DownloadOutlined, FileOutlined, EditOutlined,
  FilePdfOutlined, FileImageOutlined, FileWordOutlined, FileExcelOutlined,
  FileZipOutlined, FileTextOutlined, LogoutOutlined, StopOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { usersApi } from '../../api/users';
import { rolesApi } from '../../api/roles';
import { filesApi } from '../../api/files';
import { authApi } from '../../api/auth';
import { usePermission, useAnyPermission } from '../../hooks/usePermission';
import { useAuthStore } from '../../store/auth';

const { useBreakpoint } = Grid;

const LANGUAGE_KEYS = [
  'russian', 'english', 'uzbek', 'kazakh', 'kyrgyz', 'tajik',
  'turkmen', 'arabic', 'french', 'german', 'spanish', 'chinese',
  'korean', 'japanese', 'italian', 'portuguese', 'hindi', 'turkish', 'persian', 'polish',
];

const LEVEL_KEYS = [
  'BEGINNER', 'ELEMENTARY', 'INTERMEDIATE', 'UPPER_INTERMEDIATE', 'ADVANCED', 'NATIVE',
];

const COUNTRY_CODES = [
  { value: '+998', label: '+998' },
  { value: '+7', label: '+7' },
  { value: '+996', label: '+996' },
  { value: '+992', label: '+992' },
  { value: '+993', label: '+993' },
  { value: '+375', label: '+375' },
  { value: '+380', label: '+380' },
  { value: '+994', label: '+994' },
  { value: '+995', label: '+995' },
  { value: '+374', label: '+374' },
];

const CIS_COUNTRY_KEYS = [
  'uzbekistan', 'russia', 'kazakhstan', 'kyrgyzstan',
  'tajikistan', 'turkmenistan', 'belarus', 'ukraine',
  'azerbaijan', 'georgia', 'armenia',
];

// Backward compat: map old Russian names to i18n keys
const LEGACY_COUNTRY_MAP: Record<string, string> = {
  'Узбекистан': 'uzbekistan', 'Россия': 'russia', 'Казахстан': 'kazakhstan',
  'Кыргызстан': 'kyrgyzstan', 'Таджикистан': 'tajikistan', 'Туркменистан': 'turkmenistan',
  'Беларусь': 'belarus', 'Украина': 'ukraine', 'Азербайджан': 'azerbaijan',
  'Грузия': 'georgia', 'Армения': 'armenia',
};
const normalizeCountryKey = (v: string) => LEGACY_COUNTRY_MAP[v] || v;

const CONTACT_TYPE_KEYS = ['MOBILE', 'WHATSAPP', 'TELEGRAM'];

function ImageThumbnail({ docId }: { docId: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let revoke = '';
    filesApi.download(docId).then(({ data }) => {
      const url = URL.createObjectURL(data);
      revoke = url;
      setSrc(url);
    });
    return () => { if (revoke) URL.revokeObjectURL(revoke); };
  }, [docId]);
  if (!src) return <FileImageOutlined style={{ fontSize: 32, color: '#1890ff' }} />;
  return <img src={src} alt="" style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 4 }} />;
}

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [profileForm] = Form.useForm();
  const [credForm] = Form.useForm();

  const canEditProfile = usePermission('users.edit_profile');
  const canEditSettings = usePermission('users.edit_settings');
  const canForceLogout = usePermission('users.force_logout');
  const canBlock = usePermission('users.block');
  const canUploadFiles = usePermission('user_docs.upload');
  const canDeleteFiles = usePermission('user_docs.delete');
  const canViewFiles = usePermission('user_docs.view');
  const canManageSession = usePermission('session.manage');
  const currentUserId = useAuthStore((s) => s.user?.id);
  const isOwnProfile = id === currentUserId;

  const [ownMaxSessions, setOwnMaxSessions] = useState<number>(1);

  // Модалки
  const [langModalOpen, setLangModalOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [editDocModal, setEditDocModal] = useState<any>(null);

  const { data: user, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: () => usersApi.getById(id!).then((r) => r.data),
    enabled: !!id,
  });

  const { data: coordinators } = useQuery({
    queryKey: ['coordinators'],
    queryFn: () => usersApi.getCoordinators().then((r) => r.data),
  });

  const { data: roles } = useQuery({
    queryKey: ['rolesList'],
    queryFn: () => rolesApi.getRolesList().then((r) => r.data),
    enabled: canEditSettings,
  });

  const invalidateUser = () => queryClient.invalidateQueries({ queryKey: ['user', id] });

  const updateProfileMut = useMutation({
    mutationFn: (data: any) => usersApi.updateProfile(id!, data),
    onSuccess: () => { message.success(t('common.success')); invalidateUser(); },
    onError: (e: any) => message.error(e.response?.data?.message || t('common.error')),
  });

  const updateCredMut = useMutation({
    mutationFn: (data: any) => usersApi.updateCredentials(id!, data),
    onSuccess: () => { message.success(t('common.success')); invalidateUser(); },
    onError: (e: any) => message.error(e.response?.data?.message || t('common.error')),
  });

  const addLangMut = useMutation({
    mutationFn: (data: any) => usersApi.addLanguage(id!, data),
    onSuccess: () => { message.success(t('common.success')); invalidateUser(); setLangModalOpen(false); },
  });

  const removeLangMut = useMutation({
    mutationFn: usersApi.removeLanguage,
    onSuccess: () => { message.success(t('common.success')); invalidateUser(); },
  });

  const addContactMut = useMutation({
    mutationFn: (data: any) => usersApi.addContact(id!, data),
    onSuccess: () => { message.success(t('common.success')); invalidateUser(); setContactModalOpen(false); },
    onError: (e: any) => message.error(e.response?.data?.message || t('common.error')),
  });

  const removeContactMut = useMutation({
    mutationFn: usersApi.removeContact,
    onSuccess: () => { message.success(t('common.success')); invalidateUser(); },
  });

  const setCitizenshipsMut = useMutation({
    mutationFn: (countries: string[]) => usersApi.setCitizenships(id!, countries),
    onSuccess: () => { message.success(t('common.success')); invalidateUser(); },
  });

  const uploadFileMut = useMutation({
    mutationFn: (data: { file: File; title: string; description?: string }) =>
      filesApi.upload(id!, data.file, data.title, data.description),
    onSuccess: () => { message.success(t('common.success')); invalidateUser(); setDocModalOpen(false); },
    onError: (e: any) => message.error(e.response?.data?.message || t('common.error')),
  });

  const deleteFileMut = useMutation({
    mutationFn: filesApi.remove,
    onSuccess: () => { message.success(t('common.success')); invalidateUser(); },
  });

  const updateFileDetailsMut = useMutation({
    mutationFn: (data: any) => filesApi.updateDetails(data.id, data.title, data.description),
    onSuccess: () => { message.success(t('common.success')); invalidateUser(); setEditDocModal(null); },
  });

  const forceLogoutMut = useMutation({
    mutationFn: () => usersApi.forceLogout(id!),
    onSuccess: () => { message.success(t('common.success')); invalidateUser(); },
    onError: (e: any) => message.error(e.response?.data?.message || t('common.error')),
  });

  const blockMut = useMutation({
    mutationFn: () => usersApi.block(id!),
    onSuccess: () => { message.success(t('common.success')); invalidateUser(); },
    onError: (e: any) => message.error(e.response?.data?.message || t('common.error')),
  });

  const unblockMut = useMutation({
    mutationFn: () => usersApi.unblock(id!),
    onSuccess: () => { message.success(t('common.success')); invalidateUser(); },
    onError: (e: any) => message.error(e.response?.data?.message || t('common.error')),
  });

  const updateSessionsMut = useMutation({
    mutationFn: (maxSessions: number) =>
      isOwnProfile
        ? authApi.updateMyMaxSessions(maxSessions)
        : usersApi.updateMaxSessions(id!, maxSessions),
    onSuccess: () => { message.success(t('common.success')); invalidateUser(); },
    onError: (e: any) => message.error(e.response?.data?.message || t('common.error')),
  });

  const handleDownload = async (docId: string, fileName: string) => {
    const { data } = await filesApi.download(docId);
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (user?.maxSessions != null) setOwnMaxSessions(user.maxSessions);
  }, [user?.maxSessions]);

  if (isLoading || !user) return null;

  const existingLanguages = user.languages?.map((l: any) => l.language) || [];
  const availableLanguages = LANGUAGE_KEYS.filter((l) => !existingLanguages.includes(l));

  // === Profile Tab ===
  const profileTab = (
    <Form
      form={profileForm}
      layout="vertical"
      disabled={!canEditProfile}
      initialValues={{
        ...user,
        firstTripDate: user.firstTripDate ? dayjs(user.firstTripDate) : null,
        birthDate: user.birthDate ? dayjs(user.birthDate) : null,
      }}
      onFinish={(values) => {
        const data = {
          ...values,
          firstTripDate: values.firstTripDate?.toISOString(),
          birthDate: values.birthDate?.toISOString(),
        };
        updateProfileMut.mutate(data);
      }}
      style={{ maxWidth: isMobile ? '100%' : 700 }}
    >
      <Form.Item name="tradeCode" label={t('users.tradeCode')}>
        <Input />
      </Form.Item>
      <Form.Item name="firstTripDate" label={t('users.firstTripDate')}>
        <DatePicker style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="isCoordinator" label={t('users.isCoordinator')}>
        <Select options={[{ value: true, label: t('users.yes') }, { value: false, label: t('users.no') }]} />
      </Form.Item>
      {!user.isCoordinator && (
        <Form.Item name="coordinatorId" label={t('users.coordinator')}>
          <Select
            allowClear
            options={coordinators?.filter((c: any) => c.id !== id).map((c: any) => ({
              value: c.id,
              label: `${c.lastName} ${c.firstName}`,
            }))}
          />
        </Form.Item>
      )}
      <Form.Item name="birthDate" label={t('users.birthDate')}>
        <DatePicker style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="isMarried" label={t('users.isMarried')}>
        <Select options={[{ value: true, label: t('users.yes') }, { value: false, label: t('users.no') }]} allowClear />
      </Form.Item>
      <Form.Item name="hasChildren" label={t('users.hasChildren')}>
        <Select options={[{ value: true, label: t('users.yes') }, { value: false, label: t('users.no') }]} allowClear />
      </Form.Item>
      <Form.Item name="hasPassport" label={t('users.hasPassport')}>
        <Select options={[{ value: true, label: t('users.yes') }, { value: false, label: t('users.no') }]} allowClear />
      </Form.Item>
      <Form.Item name="hasDriverLicense" label={t('users.hasDriverLicense')}>
        <Select options={[{ value: true, label: t('users.yes') }, { value: false, label: t('users.no') }]} allowClear />
      </Form.Item>
      <Form.Item name="drivingExperience" label={t('users.drivingExperience')}>
        <InputNumber min={0} max={50} step={0.25} style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="comment" label={t('users.comment')}>
        <Input.TextArea maxLength={500} showCount />
      </Form.Item>
      <Form.Item name="passportNumber" label={t('users.passportNumber')}>
        <Input />
      </Form.Item>
      <Form.Item name="registrationAddress" label={t('users.registrationAddress')}>
        <Input />
      </Form.Item>
      <Form.Item name="livingAddress" label={t('users.livingAddress')}>
        <Input />
      </Form.Item>

      {/* Языки */}
      <Typography.Title level={5}>{t('users.languages')}</Typography.Title>
      <Space wrap style={{ marginBottom: 8 }}>
        {user.languages?.map((lang: any) => (
          <Tag key={lang.id} closable={canEditProfile} onClose={() => removeLangMut.mutate(lang.id)}>
            {t(`langs.${lang.language}`)} — {t(`levels.${lang.level}`)}
          </Tag>
        ))}
      </Space>
      {canEditProfile && (
        <Button size="small" icon={<PlusOutlined />} onClick={() => setLangModalOpen(true)}>
          {t('users.addLanguage')}
        </Button>
      )}

      {/* Гражданства */}
      <Typography.Title level={5} style={{ marginTop: 16 }}>{t('users.citizenships')}</Typography.Title>
      <Select
        mode="multiple"
        disabled={!canEditProfile}
        style={{ width: '100%', marginBottom: 16 }}
        value={user.citizenships?.map((c: any) => normalizeCountryKey(c.country))}
        onChange={(values) => setCitizenshipsMut.mutate(values)}
        options={CIS_COUNTRY_KEYS.map((k) => ({ value: k, label: t(`countries.${k}`) }))}
      />

      {/* Контакты */}
      <Typography.Title level={5}>{t('users.contacts')}</Typography.Title>
      <List
        size="small"
        dataSource={user.contacts || []}
        renderItem={(contact: any) => (
          <List.Item
            actions={canEditProfile ? [
              <Button size="small" danger icon={<DeleteOutlined />} onClick={() => removeContactMut.mutate(contact.id)} />,
            ] : []}
          >
            <Tag color="blue">{t(`contactTypes.${contact.type}`)}</Tag> {contact.countryCode} {contact.phone}
          </List.Item>
        )}
      />
      {canEditProfile && (user.contacts?.length || 0) < 5 && (
        <Button size="small" icon={<PlusOutlined />} onClick={() => setContactModalOpen(true)}>
          {t('users.addContact')}
        </Button>
      )}

      {canEditProfile && (
        <Form.Item style={{ marginTop: 24 }}>
          <Button type="primary" htmlType="submit" loading={updateProfileMut.isPending}>
            {t('common.save')}
          </Button>
        </Form.Item>
      )}
    </Form>
  );

  // === Documents Tab (Google Drive style) ===
  const getFileIcon = (mimeType: string) => {
    if (mimeType?.includes('pdf')) return <FilePdfOutlined style={{ fontSize: 32, color: '#ff4d4f' }} />;
    if (mimeType?.includes('image')) return <FileImageOutlined style={{ fontSize: 32, color: '#1890ff' }} />;
    if (mimeType?.includes('word') || mimeType?.includes('document')) return <FileWordOutlined style={{ fontSize: 32, color: '#2f54eb' }} />;
    if (mimeType?.includes('sheet') || mimeType?.includes('excel')) return <FileExcelOutlined style={{ fontSize: 32, color: '#52c41a' }} />;
    if (mimeType?.includes('zip') || mimeType?.includes('archive')) return <FileZipOutlined style={{ fontSize: 32, color: '#faad14' }} />;
    if (mimeType?.includes('text')) return <FileTextOutlined style={{ fontSize: 32, color: '#8c8c8c' }} />;
    return <FileOutlined style={{ fontSize: 32, color: '#8c8c8c' }} />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const docsTab = (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Typography.Text type="secondary">
          {user.documents?.length || 0} / 15 {t('files.maxFiles').toLowerCase()}
        </Typography.Text>
        {canUploadFiles && (user.documents?.length || 0) < 15 && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setDocModalOpen(true)} size={isMobile ? 'small' : 'middle'}>
            {t('files.upload')}
          </Button>
        )}
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(auto-fill, minmax(150px, 1fr))' : 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: isMobile ? 8 : 16,
      }}>
        {(user.documents || []).map((doc: any) => (
          <Card
            key={doc.id}
            hoverable
            size="small"
            style={{ borderRadius: 8 }}
            styles={{ body: { padding: isMobile ? 8 : 16 } }}
            actions={[
              canViewFiles && <DownloadOutlined key="download" onClick={() => handleDownload(doc.id, doc.fileName)} />,
              canUploadFiles && <EditOutlined key="edit" onClick={() => setEditDocModal(doc)} />,
              canDeleteFiles && <DeleteOutlined key="delete" style={{ color: '#ff4d4f' }} onClick={() => {
                Modal.confirm({
                  title: t('common.delete') + '?',
                  onOk: () => deleteFileMut.mutate(doc.id),
                });
              }} />,
            ].filter(Boolean)}
          >
            <div style={{ textAlign: 'center', padding: isMobile ? '6px 0' : '12px 0' }}>
              {doc.mimeType?.includes('image')
                ? <ImageThumbnail docId={doc.id} />
                : getFileIcon(doc.mimeType)}
            </div>
            <Typography.Text strong ellipsis style={{ display: 'block', marginBottom: 4, fontSize: isMobile ? 12 : 14 }}>
              {doc.title}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {formatFileSize(doc.fileSize)}
            </Typography.Text>
            <br />
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              {dayjs(doc.createdAt).format('DD.MM.YYYY')}
            </Typography.Text>
          </Card>
        ))}
      </div>
      {(!user.documents || user.documents.length === 0) && (
        <div style={{ textAlign: 'center', padding: isMobile ? 24 : 48 }}>
          <FileOutlined style={{ fontSize: 48, color: '#434343' }} />
          <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
            {t('common.noData')}
          </Typography.Text>
        </div>
      )}
    </div>
  );

  // === Settings Tab ===
  const settingsTab = (
    <Form
      form={credForm}
      layout="vertical"
      initialValues={{ email: user.email, roleId: user.role?.id }}
      onFinish={(values) => {
        const data: any = {};
        if (values.email !== user.email) data.email = values.email;
        if (values.password) data.password = values.password;
        if (values.roleId !== user.role?.id) data.roleId = values.roleId;
        updateCredMut.mutate(data);
      }}
      style={{ maxWidth: isMobile ? '100%' : 500 }}
    >
      <Form.Item name="email" label={t('users.email')} rules={[{ type: 'email' }]}>
        <Input />
      </Form.Item>
      <Form.Item name="password" label={t('auth.password')}>
        <Input.Password placeholder={t('users.passwordPlaceholder')} />
      </Form.Item>
      <Form.Item name="roleId" label={t('users.role')}>
        <Select
          allowClear
          options={roles?.map((role: any) => ({
            value: role.id,
            label: `${role.name} — ${role.description || ''}`,
          }))}
        />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={updateCredMut.isPending}>
          {t('common.save')}
        </Button>
      </Form.Item>
    </Form>
  );

  return (
    <>
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'stretch' : 'flex-start',
        marginBottom: 16,
        gap: 12,
      }}>
        <Descriptions
          title={`${user.lastName} ${user.firstName} ${user.middleName || ''}`}
          bordered
          size="small"
          column={isMobile ? 1 : 3}
          style={{ flex: 1 }}
        >
          <Descriptions.Item label={t('users.email')}>{user.email}</Descriptions.Item>
          <Descriptions.Item label={t('users.status')}>
            <Badge status={user.isOnline ? 'success' : 'default'} text={user.isOnline ? t('users.statusOnline') : t('users.statusOffline')} />
          </Descriptions.Item>
          <Descriptions.Item label={t('users.role')}>{user.role?.name || '—'}</Descriptions.Item>
        </Descriptions>
        <Space wrap style={{ marginTop: isMobile ? 0 : 4 }}>
          {canForceLogout && (
            <Button
              size={isMobile ? 'small' : 'middle'}
              icon={<LogoutOutlined />}
              onClick={() => Modal.confirm({
                title: t('users.forceLogout') + '?',
                onOk: () => forceLogoutMut.mutate(),
              })}
            >
              {t('users.forceLogout')}
            </Button>
          )}
          {canBlock && (
            user.isActive ? (
              <Button
                size={isMobile ? 'small' : 'middle'}
                danger
                icon={<StopOutlined />}
                onClick={() => Modal.confirm({
                  title: t('users.block') + '?',
                  onOk: () => blockMut.mutate(),
                })}
              >
                {t('users.block')}
              </Button>
            ) : (
              <Button
                size={isMobile ? 'small' : 'middle'}
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => Modal.confirm({
                  title: t('users.unblock') + '?',
                  onOk: () => unblockMut.mutate(),
                })}
              >
                {t('users.unblock')}
              </Button>
            )
          )}
        </Space>
      </div>

      {canManageSession && (
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Typography.Text strong>{t('users.maxSessions')}:</Typography.Text>
          <InputNumber
            min={1}
            max={10}
            value={ownMaxSessions}
            onChange={(v) => v && setOwnMaxSessions(v)}
            style={{ width: 80 }}
          />
          <Button
            type="primary"
            size="small"
            loading={updateSessionsMut.isPending}
            disabled={ownMaxSessions === (user.maxSessions ?? 1)}
            onClick={() => updateSessionsMut.mutate(ownMaxSessions)}
          >
            {t('common.save')}
          </Button>
        </div>
      )}

      <Tabs
        defaultActiveKey="profile"
        size={isMobile ? 'small' : 'middle'}
        items={[
          { key: 'profile', label: t('users.profile'), children: profileTab },
          ...(canViewFiles ? [{ key: 'documents', label: t('users.documents'), children: docsTab }] : []),
          ...(canEditSettings ? [{ key: 'settings', label: t('users.settings'), children: settingsTab }] : []),
        ]}
      />

      {/* Модалка: добавить язык */}
      <Modal
        title={t('users.addLanguage')}
        open={langModalOpen}
        onCancel={() => setLangModalOpen(false)}
        footer={null}
        width={isMobile ? '95%' : 520}
      >
        <Form onFinish={(v) => addLangMut.mutate(v)} layout="vertical">
          <Form.Item name="language" label={t('users.languages')} rules={[{ required: true }]}>
            <Select options={availableLanguages.map((l) => ({ value: l, label: t(`langs.${l}`) }))} />
          </Form.Item>
          <Form.Item name="level" label={t('users.level')} rules={[{ required: true }]}>
            <Select options={LEVEL_KEYS.map((l) => ({ value: l, label: t(`levels.${l}`) }))} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={addLangMut.isPending}>{t('common.save')}</Button>
        </Form>
      </Modal>

      {/* Модалка: добавить контакт */}
      <Modal
        title={t('users.addContact')}
        open={contactModalOpen}
        onCancel={() => setContactModalOpen(false)}
        footer={null}
        width={isMobile ? '95%' : 520}
      >
        <Form onFinish={(v) => addContactMut.mutate(v)} layout="vertical">
          <Form.Item name="type" label={t('users.contactType')} rules={[{ required: true }]}>
            <Select options={CONTACT_TYPE_KEYS.map((k) => ({ value: k, label: t(`contactTypes.${k}`) }))} />
          </Form.Item>
          <Form.Item name="countryCode" label={t('users.countryCode')} rules={[{ required: true }]}>
            <Select options={COUNTRY_CODES} />
          </Form.Item>
          <Form.Item name="phone" label={t('users.phone')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={addContactMut.isPending}>{t('common.save')}</Button>
        </Form>
      </Modal>

      {/* Модалка: загрузить документ */}
      <Modal
        title={t('files.upload')}
        open={docModalOpen}
        onCancel={() => setDocModalOpen(false)}
        footer={null}
        width={isMobile ? '95%' : 520}
      >
        <Form
          onFinish={(v) => uploadFileMut.mutate({ file: v.file.file, title: v.title, description: v.description })}
          layout="vertical"
        >
          <Form.Item name="title" label={t('files.title')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label={t('files.description')}>
            <Input.TextArea />
          </Form.Item>
          <Form.Item name="file" label={t('files.file')} rules={[{ required: true }]}>
            <Upload beforeUpload={() => false} maxCount={1} accept="image/*,.pdf">
              <Button>{t('files.upload')}</Button>
            </Upload>
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={uploadFileMut.isPending}>{t('common.save')}</Button>
        </Form>
      </Modal>

      {/* Модалка: редактировать детали документа */}
      <Modal
        title={t('files.details')}
        open={!!editDocModal}
        onCancel={() => setEditDocModal(null)}
        footer={null}
        width={isMobile ? '95%' : 520}
      >
        {editDocModal && (
          <Form
            initialValues={{ title: editDocModal.title, description: editDocModal.description }}
            onFinish={(v) => updateFileDetailsMut.mutate({ id: editDocModal.id, ...v })}
            layout="vertical"
          >
            <Form.Item name="title" label={t('files.title')} rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="description" label={t('files.description')}>
              <Input.TextArea />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={updateFileDetailsMut.isPending}>{t('common.save')}</Button>
          </Form>
        )}
      </Modal>
    </>
  );
}
