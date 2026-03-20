import { useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import {
  DatePicker,
  Select,
  Tabs,
  Table,
  Spin,
  Card,
  Space,
  Typography,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { BarChartOutlined } from '@ant-design/icons';
import { statsApi, StatsRow } from '../../api/stats';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// Опции группировки
const GROUP_BY_OPTIONS = [
  { value: 'day', label: 'День' },
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: 'year', label: 'Год' },
  { value: 'trip', label: 'Выезд' },
];

// Отображение роли в составе
const ROLE_LABELS: Record<string, string> = {
  LEADER: 'Ведущий',
  MV: 'МВ',
  GA: 'ГА',
  MV_GA: 'МВ/ГА',
  TRADER: 'Торговый',
};

/** Рендер значения, которое может быть null — выводим «—» */
function nullCell(v: number | null) {
  return v === null ? <span style={{ color: '#aaa' }}>—</span> : v;
}

export default function StatsPresentationsPage() {
  // ---- Состояние фильтров ----
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);
  const [groupBy, setGroupBy] = useState<string>('month');
  const [activeTab, setActiveTab] = useState<string>('dates');

  // Формируем строки дат для запроса
  const from = dateRange ? dateRange[0].format('YYYY-MM-DD') : '';
  const to = dateRange ? dateRange[1].format('YYYY-MM-DD') : '';
  const enabled = Boolean(from && to);

  // ---- Загрузка данных ----
  const { data, isLoading } = useQuery({
    queryKey: ['stats', 'presentations', from, to, groupBy, activeTab],
    queryFn: () =>
      statsApi.getPresentationStats({ from, to, groupBy, tab: activeTab }),
    enabled,
  });

  // ---- Определение колонок таблицы ----
  const isDateTab = activeTab === 'dates';
  const isIndividual = activeTab === 'individual';

  // Первая колонка: Период или Имя
  const firstColumn: ColumnsType<StatsRow>[number] = {
    title: isDateTab ? 'Период' : 'Имя',
    dataIndex: 'label',
    key: 'label',
    fixed: 'left',
    width: 200,
    render: (v: string) => <strong>{v}</strong>,
  };

  // Колонка роли (только для вкладки "Индивидуально")
  const roleColumn: ColumnsType<StatsRow>[number] = {
    title: 'Роль',
    dataIndex: 'role',
    key: 'role',
    width: 100,
    render: (v: string) => (
      <Tag color="blue">{ROLE_LABELS[v] ?? v ?? '—'}</Tag>
    ),
  };

  // Общие колонки для всех вкладок
  const commonColumns: ColumnsType<StatsRow> = [
    // Количество презентаций (только для вкладки "По датам")
    ...(isDateTab
      ? [
          {
            title: 'Презентаций',
            dataIndex: 'presentationsCount',
            key: 'presentationsCount',
            width: 100,
            align: 'right' as const,
          },
        ]
      : []),
    {
      title: 'Пригл.',
      dataIndex: 'invited',
      key: 'invited',
      width: 80,
      align: 'right' as const,
    },
    {
      title: 'Приход',
      key: 'arrived',
      width: 110,
      align: 'right' as const,
      render: (_: any, r: StatsRow) => `${r.arrived} (${r.pctArrived}%)`,
    },
    {
      title: 'Пары',
      dataIndex: 'arrivedPairs',
      key: 'arrivedPairs',
      width: 70,
      align: 'right' as const,
    },
    {
      title: 'у/Пар',
      key: 'left',
      width: 90,
      align: 'right' as const,
      render: (_: any, r: StatsRow) => (
        <span style={{ color: r.leftGuests > 0 ? '#f5222d' : undefined }}>
          {r.leftGuests}/{r.leftPairs}
        </span>
      ),
    },
    {
      title: 'н/Пар',
      key: 'notLet',
      width: 90,
      align: 'right' as const,
      render: (_: any, r: StatsRow) => (
        <span style={{ color: r.notLetGuests > 0 ? '#fa8c16' : undefined }}>
          {r.notLetGuests}/{r.notLetPairs}
        </span>
      ),
    },
    {
      title: 'В зале г/п',
      key: 'inHall',
      width: 100,
      align: 'right' as const,
      render: (_: any, r: StatsRow) => (
        <span style={{ color: '#52c41a' }}>
          {r.inHallGuests}/{r.inHallPairs}
        </span>
      ),
    },
    {
      title: 'Успешных',
      dataIndex: 'successApproach',
      key: 'successApproach',
      width: 100,
      align: 'right' as const,
      render: nullCell,
    },
    {
      title: 'Часовка всех',
      dataIndex: 'totalApproach',
      key: 'totalApproach',
      width: 110,
      align: 'right' as const,
      render: nullCell,
    },
    {
      title: 'Кол. отказов',
      dataIndex: 'refusalCount',
      key: 'refusalCount',
      width: 110,
      align: 'right' as const,
      render: nullCell,
    },
    {
      title: 'Знач. отказа',
      dataIndex: 'refusalValue',
      key: 'refusalValue',
      width: 110,
      align: 'right' as const,
      render: nullCell,
    },
    {
      title: 'Кол. переписан.',
      dataIndex: 'rewriteCount',
      key: 'rewriteCount',
      width: 130,
      align: 'right' as const,
      render: nullCell,
    },
    {
      title: 'Ценность перепис.',
      dataIndex: 'rewriteValue',
      key: 'rewriteValue',
      width: 140,
      align: 'right' as const,
      render: nullCell,
    },
  ];

  // Итоговый массив колонок
  const columns: ColumnsType<StatsRow> = [
    firstColumn,
    ...(isIndividual ? [roleColumn] : []),
    ...commonColumns,
  ];

  // ---- Вкладки ----
  const tabItems = [
    { key: 'dates', label: 'По датам' },
    { key: 'leaders', label: 'По ведущим' },
    { key: 'coordinators', label: 'По координаторам' },
    { key: 'individual', label: 'Индивидуально' },
  ];

  return (
    <div>
      {/* Заголовок страницы */}
      <Space align="center" style={{ marginBottom: 16 }}>
        <BarChartOutlined style={{ fontSize: 20 }} />
        <Title level={4} style={{ margin: 0 }}>
          Статистика презентаций
        </Title>
      </Space>

      {/* Фильтры */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <span>Период:</span>
          <RangePicker
            value={dateRange as any}
            onChange={(v) => setDateRange(v as [Dayjs, Dayjs] | null)}
            format="DD.MM.YYYY"
            allowClear={false}
          />
          <span>Группировка:</span>
          <Select
            value={groupBy}
            onChange={setGroupBy}
            options={GROUP_BY_OPTIONS}
            style={{ width: 130 }}
          />
          {data && (
            <Text type="secondary">
              Найдено строк: {data.length}
            </Text>
          )}
        </Space>
      </Card>

      {/* Вкладки + таблица */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
      />

      <Spin spinning={isLoading}>
        <Table<StatsRow>
          dataSource={data ?? []}
          columns={columns}
          rowKey="key"
          size="small"
          scroll={{ x: 1800 }}
          pagination={{
            pageSize: 50,
            pageSizeOptions: ['50', '100', '500'],
            showSizeChanger: true,
          }}
          locale={{ emptyText: isLoading ? 'Загрузка...' : 'Нет данных' }}
        />
      </Spin>
    </div>
  );
}
