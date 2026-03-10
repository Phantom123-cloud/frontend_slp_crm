import { useState, useEffect } from "react";
import {
  Tabs,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Popconfirm,
  message,
  Typography,
  Tag,
} from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { directoriesApi } from "../../api/directories";
import { useAnyPermission } from "../../hooks/usePermission";
import { useTableFilters } from "../../utils/tableFilters";

const { Title } = Typography;

export default function DirectoriesPage() {
  const { t } = useTranslation();
  const canCreate = useAnyPermission(["directories.create"]);
  const canEdit = useAnyPermission(["directories.edit"]);
  const canDelete = useAnyPermission(["directories.delete"]);
  const canManage = canCreate || canEdit || canDelete;
  const { colSearch } = useTableFilters();

  // === Presentation Types ===
  const [types, setTypes] = useState<any[]>([]);
  const [typesLoading, setTypesLoading] = useState(false);
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [editType, setEditType] = useState<any>(null);
  const [typeForm] = Form.useForm();
  const [editTypeForm] = Form.useForm();

  const loadTypes = async () => {
    setTypesLoading(true);
    try {
      const { data } = await directoriesApi.getPresentationTypes();
      setTypes(data);
    } catch (e: any) {
      message.error(t(e.response?.data?.message || "common.error"));
    } finally {
      setTypesLoading(false);
    }
  };

  const handleCreateType = async (values: any) => {
    try {
      await directoriesApi.createPresentationType(values);
      message.success(t("common.success"));
      setTypeModalOpen(false);
      typeForm.resetFields();
      loadTypes();
    } catch (e: any) {
      message.error(t(e.response?.data?.message || "common.error"));
    }
  };

  const handleUpdateType = async (values: any) => {
    try {
      await directoriesApi.updatePresentationType(editType.id, values);
      message.success(t("common.success"));
      setEditType(null);
      loadTypes();
    } catch (e: any) {
      message.error(t(e.response?.data?.message || "common.error"));
    }
  };

  const handleDeleteType = async (id: string) => {
    try {
      await directoriesApi.deletePresentationType(id);
      message.success(t("common.success"));
      loadTypes();
    } catch (e: any) {
      message.error(t(e.response?.data?.message || "common.error"));
    }
  };

  // === Products ===
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [productForm] = Form.useForm();
  const [editProductForm] = Form.useForm();

  const loadProducts = async () => {
    setProductsLoading(true);
    try {
      const { data } = await directoriesApi.getProducts();
      setProducts(data);
    } catch (e: any) {
      message.error(t(e.response?.data?.message || "common.error"));
    } finally {
      setProductsLoading(false);
    }
  };

  const handleCreateProduct = async (values: any) => {
    try {
      await directoriesApi.createProduct(values);
      message.success(t("common.success"));
      setProductModalOpen(false);
      productForm.resetFields();
      loadProducts();
    } catch (e: any) {
      message.error(t(e.response?.data?.message || "common.error"));
    }
  };

  const handleUpdateProduct = async (values: any) => {
    try {
      await directoriesApi.updateProduct(editProduct.id, values);
      message.success(t("common.success"));
      setEditProduct(null);
      loadProducts();
    } catch (e: any) {
      message.error(t(e.response?.data?.message || "common.error"));
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await directoriesApi.deleteProduct(id);
      message.success(t("common.success"));
      loadProducts();
    } catch (e: any) {
      message.error(t(e.response?.data?.message || "common.error"));
    }
  };

  // === Venues ===
  const [venues, setVenues] = useState<any[]>([]);
  const [venuesLoading, setVenuesLoading] = useState(false);
  const [venueModalOpen, setVenueModalOpen] = useState(false);
  const [editVenue, setEditVenue] = useState<any>(null);
  const [venueForm] = Form.useForm();
  const [editVenueForm] = Form.useForm();

  const loadVenues = async () => {
    setVenuesLoading(true);
    try {
      const { data } = await directoriesApi.getVenues();
      setVenues(data);
    } catch (e: any) {
      message.error(t(e.response?.data?.message || "common.error"));
    } finally {
      setVenuesLoading(false);
    }
  };

  const handleCreateVenue = async (values: any) => {
    try {
      await directoriesApi.createVenue(values);
      message.success(t("common.success"));
      setVenueModalOpen(false);
      venueForm.resetFields();
      loadVenues();
    } catch (e: any) {
      message.error(t(e.response?.data?.message || "common.error"));
    }
  };

  const handleUpdateVenue = async (values: any) => {
    try {
      await directoriesApi.updateVenue(editVenue.id, values);
      message.success(t("common.success"));
      setEditVenue(null);
      loadVenues();
    } catch (e: any) {
      message.error(t(e.response?.data?.message || "common.error"));
    }
  };

  const handleDeleteVenue = async (id: string) => {
    try {
      await directoriesApi.deleteVenue(id);
      message.success(t("common.success"));
      loadVenues();
    } catch (e: any) {
      message.error(t(e.response?.data?.message || "common.error"));
    }
  };

  // === Expense Types ===
  const [expenseTypes, setExpenseTypes] = useState<any[]>([]);
  const [expenseTypesLoading, setExpenseTypesLoading] = useState(false);
  const [expenseTypeModalOpen, setExpenseTypeModalOpen] = useState(false);
  const [editExpenseType, setEditExpenseType] = useState<any>(null);
  const [expenseTypeForm] = Form.useForm();
  const [editExpenseTypeForm] = Form.useForm();

  const loadExpenseTypes = async () => {
    setExpenseTypesLoading(true);
    try {
      const { data } = await directoriesApi.getExpenseTypes();
      setExpenseTypes(data);
    } catch (e: any) {
      message.error(t(e.response?.data?.message || "common.error"));
    } finally {
      setExpenseTypesLoading(false);
    }
  };

  const handleCreateExpenseType = async (values: any) => {
    try {
      await directoriesApi.createExpenseType(values);
      message.success(t("common.success"));
      setExpenseTypeModalOpen(false);
      expenseTypeForm.resetFields();
      loadExpenseTypes();
    } catch (e: any) {
      message.error(t(e.response?.data?.message || "common.error"));
    }
  };

  const handleUpdateExpenseType = async (values: any) => {
    try {
      await directoriesApi.updateExpenseType(editExpenseType.id, values);
      message.success(t("common.success"));
      setEditExpenseType(null);
      loadExpenseTypes();
    } catch (e: any) {
      message.error(t(e.response?.data?.message || "common.error"));
    }
  };

  const handleDeleteExpenseType = async (id: string) => {
    try {
      await directoriesApi.deleteExpenseType(id);
      message.success(t("common.success"));
      loadExpenseTypes();
    } catch (e: any) {
      message.error(t(e.response?.data?.message || "common.error"));
    }
  };

  useEffect(() => {
    loadTypes();
    loadVenues();
    loadProducts();
    loadExpenseTypes();
  }, []);

  // === Columns ===

  const expenseTypeColumns = [
    {
      title: t("directories.name"),
      dataIndex: "name",
      key: "name",
      ...colSearch((r: any) => r.name || ""),
    },
    ...(canEdit || canDelete
      ? [
          {
            title: t("users.actions"),
            key: "actions",
            width: 100,
            render: (_: any, record: any) => (
              <Space size={4}>
                {canEdit && <Button
                  type="text"
                  icon={<EditOutlined />}
                  size="small"
                  onClick={() => {
                    setEditExpenseType(record);
                    editExpenseTypeForm.setFieldsValue({ name: record.name });
                  }}
                />}
                {canDelete && <Popconfirm
                  title={t("common.confirmDelete")}
                  onConfirm={() => handleDeleteExpenseType(record.id)}
                  okText={t("common.yes")}
                  cancelText={t("common.no")}
                >
                  <Button type="text" danger icon={<DeleteOutlined />} size="small" />
                </Popconfirm>}
              </Space>
            ),
          },
        ]
      : []),
  ];

  const typeColumns = [
    {
      title: t("directories.name"),
      dataIndex: "name",
      key: "name",
      ...colSearch((r: any) => r.name || ""),
    },
    {
      title: t("directories.description"),
      dataIndex: "description",
      key: "description",
      ...colSearch((r: any) => r.description || ""),
      render: (v: any) => v || "—",
    },
    ...(canEdit || canDelete
      ? [
          {
            title: t("users.actions"),
            key: "actions",
            width: 100,
            render: (_: any, record: any) => (
              <Space size={4}>
                {canEdit && <Button
                  type="text"
                  icon={<EditOutlined />}
                  size="small"
                  onClick={() => {
                    setEditType(record);
                    editTypeForm.setFieldsValue({
                      name: record.name,
                      description: record.description,
                    });
                  }}
                />}
                {canDelete && <Popconfirm
                  title={t("directories.deleteConfirm")}
                  onConfirm={() => handleDeleteType(record.id)}
                  okText={t("users.yes")}
                  cancelText={t("users.no")}
                >
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    size="small"
                  />
                </Popconfirm>}
              </Space>
            ),
          },
        ]
      : []),
  ];

  const productColumns = [
    {
      title: t("directories.productName"),
      dataIndex: "name",
      key: "name",
      ...colSearch((r: any) => r.name || ""),
    },
    {
      title: t("directories.unit"),
      dataIndex: "unit",
      key: "unit",
      width: 100,
    },
    {
      title: t("directories.sku"),
      dataIndex: "sku",
      key: "sku",
      ...colSearch((r: any) => r.sku || ""),
      render: (v: any) => v || "—",
    },
    {
      title: t("users.active"),
      dataIndex: "isActive",
      key: "isActive",
      width: 100,
      render: (v: boolean) =>
        v ? (
          <Tag color="green">{t("users.yes")}</Tag>
        ) : (
          <Tag color="red">{t("users.no")}</Tag>
        ),
    },
    ...(canEdit || canDelete
      ? [
          {
            title: t("users.actions"),
            key: "actions",
            width: 100,
            render: (_: any, record: any) => (
              <Space size={4}>
                {canEdit && <Button
                  type="text"
                  icon={<EditOutlined />}
                  size="small"
                  onClick={() => {
                    setEditProduct(record);
                    editProductForm.setFieldsValue({
                      name: record.name,
                      unit: record.unit,
                      sku: record.sku,
                    });
                  }}
                />}
                {canDelete && <Popconfirm
                  title={t("warehouses.deleteConfirm")}
                  onConfirm={() => handleDeleteProduct(record.id)}
                  okText={t("users.yes")}
                  cancelText={t("users.no")}
                >
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    size="small"
                  />
                </Popconfirm>}
              </Space>
            ),
          },
        ]
      : []),
  ];

  const venueColumns = [
    {
      title: t("directories.city"),
      dataIndex: "city",
      key: "city",
      ...colSearch((r: any) => r.city || ""),
    },
    {
      title: t("directories.venueName"),
      dataIndex: "venueName",
      key: "venueName",
      ...colSearch((r: any) => r.venueName || ""),
    },
    {
      title: t("directories.address"),
      dataIndex: "address",
      key: "address",
      ...colSearch((r: any) => r.address || ""),
    },
    ...(canEdit || canDelete
      ? [
          {
            title: t("users.actions"),
            key: "actions",
            width: 100,
            render: (_: any, record: any) => (
              <Space size={4}>
                {canEdit && <Button
                  type="text"
                  icon={<EditOutlined />}
                  size="small"
                  onClick={() => {
                    setEditVenue(record);
                    editVenueForm.setFieldsValue({
                      city: record.city,
                      venueName: record.venueName,
                      address: record.address,
                    });
                  }}
                />}
                {canDelete && <Popconfirm
                  title={t("directories.deleteConfirm")}
                  onConfirm={() => handleDeleteVenue(record.id)}
                  okText={t("users.yes")}
                  cancelText={t("users.no")}
                >
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    size="small"
                  />
                </Popconfirm>}
              </Space>
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      <Title level={3}>{t("directories.title")}</Title>

      <Tabs
        items={[
          {
            key: "types",
            label: t("directories.presentationTypes"),
            children: (
              <>
                {canCreate && (
                  <div style={{ marginBottom: 16 }}>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => setTypeModalOpen(true)}
                    >
                      {t("common.add")}
                    </Button>
                  </div>
                )}
                <Table
                  dataSource={types}
                  columns={typeColumns}
                  rowKey="id"
                  loading={typesLoading}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: false,
                  }}
                  size="small"
                />
              </>
            ),
          },
          {
            key: "products",
            label: t("directories.products"),
            children: (
              <>
                {canCreate && (
                  <div style={{ marginBottom: 16 }}>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => setProductModalOpen(true)}
                    >
                      {t("directories.addProduct")}
                    </Button>
                  </div>
                )}
                <Table
                  dataSource={products}
                  columns={productColumns}
                  rowKey="id"
                  loading={productsLoading}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: false,
                  }}
                  size="small"
                />
              </>
            ),
          },
          {
            key: "expenseTypes",
            label: t("directories.expenseTypes"),
            children: (
              <>
                {canCreate && (
                  <div style={{ marginBottom: 16 }}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setExpenseTypeModalOpen(true)}>
                      {t("common.add")}
                    </Button>
                  </div>
                )}
                <Table
                  dataSource={expenseTypes}
                  columns={expenseTypeColumns}
                  rowKey="id"
                  loading={expenseTypesLoading}
                  pagination={{ pageSize: 20, showSizeChanger: false }}
                  size="small"
                />
              </>
            ),
          },
          {
            key: "venues",
            label: t("directories.venues"),
            children: (
              <>
                {canCreate && (
                  <div style={{ marginBottom: 16 }}>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => setVenueModalOpen(true)}
                    >
                      {t("common.add")}
                    </Button>
                  </div>
                )}
                <Table
                  dataSource={venues}
                  columns={venueColumns}
                  rowKey="id"
                  loading={venuesLoading}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: false,
                  }}
                  size="small"
                />
              </>
            ),
          },
        ]}
      />

      {/* Create Product */}
      <Modal
        title={t("directories.addProduct")}
        open={productModalOpen}
        onCancel={() => {
          setProductModalOpen(false);
          productForm.resetFields();
        }}
        onOk={() => productForm.submit()}
        okText={t("common.save")}
        cancelText={t("common.cancel")}
      >
        <Form form={productForm} onFinish={handleCreateProduct} layout="vertical">
          <Form.Item
            name="name"
            label={t("directories.productName")}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="unit"
            label={t("directories.unit")}
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: "шт", label: t("directories.unitOptions.pcs") },
                { value: "кг", label: t("directories.unitOptions.kg") },
                { value: "л", label: t("directories.unitOptions.l") },
                { value: "уп", label: t("directories.unitOptions.pack") },
                { value: "м", label: t("directories.unitOptions.m") },
              ]}
            />
          </Form.Item>
          <Form.Item name="sku" label={t("directories.sku")}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Product */}
      <Modal
        title={t("common.edit")}
        open={!!editProduct}
        onCancel={() => setEditProduct(null)}
        onOk={() => editProductForm.submit()}
        okText={t("common.save")}
        cancelText={t("common.cancel")}
        destroyOnClose
      >
        <Form form={editProductForm} onFinish={handleUpdateProduct} layout="vertical">
          <Form.Item
            name="name"
            label={t("directories.productName")}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="unit"
            label={t("directories.unit")}
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: "шт", label: t("directories.unitOptions.pcs") },
                { value: "кг", label: t("directories.unitOptions.kg") },
                { value: "л", label: t("directories.unitOptions.l") },
                { value: "уп", label: t("directories.unitOptions.pack") },
                { value: "м", label: t("directories.unitOptions.m") },
              ]}
            />
          </Form.Item>
          <Form.Item name="sku" label={t("directories.sku")}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* Create Presentation Type */}
      <Modal
        title={t("directories.addType")}
        open={typeModalOpen}
        onCancel={() => {
          setTypeModalOpen(false);
          typeForm.resetFields();
        }}
        onOk={() => typeForm.submit()}
        okText={t("common.save")}
        cancelText={t("common.cancel")}
      >
        <Form form={typeForm} onFinish={handleCreateType} layout="vertical">
          <Form.Item
            name="name"
            label={t("directories.name")}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label={t("directories.description")}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Presentation Type */}
      <Modal
        title={t("common.edit")}
        open={!!editType}
        onCancel={() => setEditType(null)}
        onOk={() => editTypeForm.submit()}
        okText={t("common.save")}
        cancelText={t("common.cancel")}
        destroyOnClose
      >
        <Form form={editTypeForm} onFinish={handleUpdateType} layout="vertical">
          <Form.Item
            name="name"
            label={t("directories.name")}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label={t("directories.description")}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Create Venue */}
      <Modal
        title={t("directories.addVenue")}
        open={venueModalOpen}
        onCancel={() => {
          setVenueModalOpen(false);
          venueForm.resetFields();
        }}
        onOk={() => venueForm.submit()}
        okText={t("common.save")}
        cancelText={t("common.cancel")}
      >
        <Form form={venueForm} onFinish={handleCreateVenue} layout="vertical">
          <Form.Item
            name="city"
            label={t("directories.city")}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="venueName"
            label={t("directories.venueName")}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="address"
            label={t("directories.address")}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Venue */}
      <Modal
        title={t("common.edit")}
        open={!!editVenue}
        onCancel={() => setEditVenue(null)}
        onOk={() => editVenueForm.submit()}
        okText={t("common.save")}
        cancelText={t("common.cancel")}
        destroyOnClose
      >
        <Form
          form={editVenueForm}
          onFinish={handleUpdateVenue}
          layout="vertical"
        >
          <Form.Item
            name="city"
            label={t("directories.city")}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="venueName"
            label={t("directories.venueName")}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="address"
            label={t("directories.address")}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* Create Expense Type */}
      <Modal
        title={t("directories.addExpenseType")}
        open={expenseTypeModalOpen}
        onCancel={() => { setExpenseTypeModalOpen(false); expenseTypeForm.resetFields(); }}
        onOk={() => expenseTypeForm.submit()}
        okText={t("common.save")}
        cancelText={t("common.cancel")}
      >
        <Form form={expenseTypeForm} onFinish={handleCreateExpenseType} layout="vertical">
          <Form.Item name="name" label={t("directories.name")} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Expense Type */}
      <Modal
        title={t("common.edit")}
        open={!!editExpenseType}
        onCancel={() => setEditExpenseType(null)}
        onOk={() => editExpenseTypeForm.submit()}
        okText={t("common.save")}
        cancelText={t("common.cancel")}
        destroyOnClose
      >
        <Form form={editExpenseTypeForm} onFinish={handleUpdateExpenseType} layout="vertical">
          <Form.Item name="name" label={t("directories.name")} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
