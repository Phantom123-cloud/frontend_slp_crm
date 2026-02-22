import { useState, useCallback } from 'react';
import {
  Table, DatePicker, Space, Input, Button, Modal, Radio, Divider, Typography, message, Grid,
} from 'antd';
import { DownloadOutlined, RightOutlined, DownOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { auditApi } from '../api/audit';

const { RangePicker } = DatePicker;
const { useBreakpoint } = Grid;

/* ─── JSON Tree component (like Swagger / code editor) ─── */
function JsonTree({ data, level = 0 }: { data: any; level?: number }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    // Auto-expand first level
    if (level === 0 && typeof data === 'object' && data !== null) {
      const keys: Record<string, boolean> = {};
      Object.keys(data).forEach((k) => { keys[k] = true; });
      return keys;
    }
    return {};
  });

  if (data === null || data === undefined) return <span style={{ color: '#999' }}>null</span>;
  if (typeof data === 'boolean') return <span style={{ color: '#0550ae' }}>{String(data)}</span>;
  if (typeof data === 'number') return <span style={{ color: '#0550ae' }}>{data}</span>;
  if (typeof data === 'string') return <span style={{ color: '#1a7f37' }}>"{data}"</span>;

  if (Array.isArray(data)) {
    if (data.length === 0) return <span style={{ color: '#666' }}>[]</span>;
    return (
      <div style={{ paddingLeft: level > 0 ? 16 : 0 }}>
        {data.map((item, idx) => (
          <div key={idx} style={{ paddingLeft: 8 }}>
            <span style={{ color: '#666' }}>{idx}: </span>
            <JsonTree data={item} level={level + 1} />
          </div>
        ))}
      </div>
    );
  }

  if (typeof data === 'object') {
    const keys = Object.keys(data);
    if (keys.length === 0) return <span style={{ color: '#666' }}>{'{}'}</span>;

    return (
      <div style={{ paddingLeft: level > 0 ? 16 : 0 }}>
        {keys.map((key) => {
          const val = data[key];
          const isExpandable = val !== null && typeof val === 'object';
          const isExpanded = expanded[key];

          if (!isExpandable) {
            return (
              <div key={key} style={{ lineHeight: '22px' }}>
                <span style={{ color: '#953800', fontWeight: 500 }}>{key}</span>
                <span style={{ color: '#666' }}>: </span>
                <JsonTree data={val} level={level + 1} />
              </div>
            );
          }

          return (
            <div key={key}>
              <div
                style={{ cursor: 'pointer', lineHeight: '22px', userSelect: 'none' }}
                onClick={() => setExpanded((p) => ({ ...p, [key]: !p[key] }))}
              >
                {isExpanded
                  ? <DownOutlined style={{ fontSize: 10, marginRight: 4 }} />
                  : <RightOutlined style={{ fontSize: 10, marginRight: 4 }} />}
                <span style={{ color: '#953800', fontWeight: 500 }}>{key}</span>
                <span style={{ color: '#666' }}>
                  : {Array.isArray(val) ? `[${val.length}]` : '{…}'}
                </span>
              </div>
              {isExpanded && <JsonTree data={val} level={level + 1} />}
            </div>
          );
        })}
      </div>
    );
  }

  return <span>{String(data)}</span>;
}

export default function AuditPage() {
  const { t } = useTranslation();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [dates, setDates] = useState<[string?, string?]>([]);
  const [entityFilter, setEntityFilter] = useState('');

  // Export state
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [exportScope, setExportScope] = useState<'page' | 'all'>('all');
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['audit', page, pageSize, dates, entityFilter],
    queryFn: () =>
      auditApi
        .getAll({
          page,
          limit: pageSize,
          dateFrom: dates[0],
          dateTo: dates[1],
          entity: entityFilter || undefined,
        })
        .then((r) => r.data),
  });

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const res = await auditApi.exportLogs({
        entity: entityFilter || undefined,
        dateFrom: dates[0],
        dateTo: dates[1],
        format: exportFormat,
        scope: exportScope,
        page,
        limit: pageSize,
      });
      const ext = exportFormat === 'csv' ? 'csv' : 'xlsx';
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit.${ext}`;
      a.click();
      window.URL.revokeObjectURL(url);
      setExportOpen(false);
      message.success(t('common.success'));
    } catch {
      message.error(t('common.error'));
    } finally {
      setExporting(false);
    }
  }, [entityFilter, dates, exportFormat, exportScope, page, pageSize, t]);

  const columns = [
    {
      title: t('audit.date'),
      dataIndex: 'createdAt',
      render: (d: string) => dayjs(d).format('DD.MM.YYYY HH:mm'),
      width: isMobile ? 120 : 160,
    },
    ...(!isMobile ? [{
      title: t('audit.user'),
      render: (_: any, r: any) =>
        r.user ? `${r.user.lastName} ${r.user.firstName}` : '—',
      width: 200,
    }] : []),
    { title: t('audit.action'), dataIndex: 'action', width: isMobile ? 140 : 200 },
    ...(!isMobile ? [{ title: t('audit.entity'), dataIndex: 'entity', width: 120 }] : []),
    {
      title: t('audit.details'),
      dataIndex: 'details',
      render: (d: any) => {
        if (!d) return <span style={{ color: '#999' }}>—</span>;
        return (
          <div style={{
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
            fontSize: 12,
            lineHeight: '20px',
            background: 'var(--json-bg, rgba(0,0,0,0.02))',
            borderRadius: 6,
            padding: '8px 12px',
            maxHeight: 300,
            overflow: 'auto',
          }}>
            <JsonTree data={d} />
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
      }}>
        <Space wrap size="small">
          <RangePicker
            onChange={(_, dateStrings) => setDates(dateStrings as [string, string])}
            placeholder={[t('audit.dateFrom'), t('audit.dateTo')]}
            style={{ width: isMobile ? '100%' : undefined }}
          />
          <Input.Search
            placeholder={t('audit.entity')}
            onSearch={setEntityFilter}
            allowClear
            style={{ width: isMobile ? '100%' : 200 }}
          />
        </Space>
        <Button icon={<DownloadOutlined />} onClick={() => setExportOpen(true)}>
          {!isMobile && t('audit.exportData')}
        </Button>
      </div>

      <Table
        dataSource={(data as any)?.data}
        rowKey="id"
        loading={isLoading}
        scroll={{ x: isMobile ? 600 : undefined }}
        pagination={{
          current: page,
          total: (data as any)?.total,
          pageSize,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          onChange: (p, size) => {
            if (size !== pageSize) {
              setPageSize(size);
              setPage(1);
            } else {
              setPage(p);
            }
          },
          size: isMobile ? 'small' : undefined,
          showTotal: isMobile ? undefined : (total) => `${total}`,
          locale: { items_per_page: '/ стр.' },
        }}
        columns={columns}
        expandable={isMobile ? {
          expandedRowRender: (record: any) => (
            <div style={{ fontSize: 13 }}>
              <div><strong>{t('audit.user')}:</strong> {record.user ? `${record.user.lastName} ${record.user.firstName}` : '—'}</div>
              <div><strong>{t('audit.entity')}:</strong> {record.entity || '—'}</div>
              {record.ip && <div><strong>IP:</strong> {record.ip}</div>}
            </div>
          ),
        } : undefined}
      />

      {/* Export Modal */}
      <Modal
        title={t('audit.exportTitle')}
        open={exportOpen}
        onCancel={() => setExportOpen(false)}
        onOk={handleExport}
        okText={t('audit.exportDownload')}
        cancelText={t('common.cancel')}
        confirmLoading={exporting}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>{t('audit.exportFormat')}</div>
          <Radio.Group value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
            <Radio.Button value="xlsx">Excel (.xlsx)</Radio.Button>
            <Radio.Button value="csv">CSV (.csv)</Radio.Button>
          </Radio.Group>
        </div>
        <Divider />
        <div>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>{t('audit.exportScope')}</div>
          <Radio.Group value={exportScope} onChange={(e) => setExportScope(e.target.value)}>
            <Radio.Button value="page">{t('audit.exportScopePage')}</Radio.Button>
            <Radio.Button value="all">{t('audit.exportScopeAll')}</Radio.Button>
          </Radio.Group>
        </div>
      </Modal>
    </div>
  );
}
