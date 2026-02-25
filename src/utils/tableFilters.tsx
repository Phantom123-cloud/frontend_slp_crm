import { useRef } from 'react';
import { Button, Input, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { InputRef } from 'antd';
import type { ColumnType } from 'antd/es/table';

/**
 * Hook returning helpers for Ant Design Table column filtering.
 *
 * Usage:
 *   const { colSearch, colEnum } = useTableFilters();
 *
 *   columns = [
 *     { title: 'Name', key: 'name', ...colSearch((r) => r.name) },
 *     { title: 'Status', key: 'status', ...colEnum([{text:'Active', value:'ACTIVE'}], (v, r) => r.status === v) },
 *   ]
 */
export function useTableFilters() {
  const { t } = useTranslation();
  const searchInput = useRef<InputRef>(null);

  /**
   * Text search filter dropdown for a column.
   * @param getValue   extract the string to search in from a row record
   * @param placeholder  placeholder for the input (defaults to common.search)
   */
  function colSearch<T>(
    getValue: (record: T) => string,
    placeholder?: string,
  ): Pick<ColumnType<T>, 'filterDropdown' | 'filterIcon' | 'onFilter' | 'onFilterDropdownOpenChange'> {
    return {
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters, close }) => (
        <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
          <Input
            ref={searchInput}
            placeholder={placeholder || t('common.search')}
            value={selectedKeys[0] as string}
            onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => confirm()}
            style={{ marginBottom: 8, display: 'block' }}
            allowClear
            onClear={() => { clearFilters?.(); confirm(); }}
          />
          <Space>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              size="small"
              style={{ width: 90 }}
              onClick={() => confirm()}
            >
              {t('common.search')}
            </Button>
            <Button
              size="small"
              style={{ width: 90 }}
              onClick={() => { clearFilters?.(); confirm(); }}
            >
              {t('common.reset')}
            </Button>
            <Button type="link" size="small" onClick={close}>✕</Button>
          </Space>
        </div>
      ),
      filterIcon: (filtered) => (
        <SearchOutlined style={{ color: filtered ? '#1677ff' : undefined }} />
      ),
      onFilter: (value, record) =>
        getValue(record)
          .toString()
          .toLowerCase()
          .includes((value as string).toLowerCase()),
      onFilterDropdownOpenChange: (visible) => {
        if (visible) setTimeout(() => searchInput.current?.select(), 100);
      },
    };
  }

  /**
   * Enum filter for a column (renders checkboxes in header dropdown).
   * @param filterValues  array of { text, value } for the filter menu
   * @param matchFn       returns true if the row matches the selected filter value
   */
  function colEnum<T>(
    filterValues: { text: string; value: string | boolean }[],
    matchFn: (value: string | boolean, record: T) => boolean,
  ): Pick<ColumnType<T>, 'filters' | 'onFilter' | 'filterMultiple'> {
    return {
      filters: filterValues.map((f) => ({ text: f.text, value: f.value as any })),
      onFilter: (value, record) => matchFn(value as string | boolean, record),
      filterMultiple: true,
    };
  }

  return { colSearch, colEnum };
}
