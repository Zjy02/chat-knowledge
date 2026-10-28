import type { ThemeConfig } from 'antd';

const fontFamily =
  "'SF Pro Text', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif";

/**
 * Ant Design tokens are aligned with the existing paper/ink/vermilion brand.
 * Keeping them here avoids one-off overrides scattered across components.
 */
export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: '#c14b2c',
    colorInfo: '#c14b2c',
    colorSuccess: '#2f6b58',
    colorWarning: '#a97d3b',
    colorError: '#a54027',
    colorText: '#1d1e1b',
    colorTextSecondary: '#7c776c',
    colorBorder: '#e3dccf',
    colorBorderSecondary: '#eee8dc',
    colorBgBase: '#f2eee6',
    colorBgContainer: '#fffdf9',
    colorBgElevated: '#fffdf9',
    borderRadius: 8,
    controlHeight: 36,
    fontSize: 13,
    fontFamily,
    wireframe: false,
  },
  components: {
    Button: {
      primaryShadow: 'none',
      defaultShadow: 'none',
      fontWeight: 600,
    },
    Input: {
      activeBorderColor: '#c9b89f',
      hoverBorderColor: '#d5ccbb',
      activeShadow: '0 0 0 3px rgba(193, 75, 44, 0.06)',
    },
    Select: {
      optionSelectedBg: '#f6e4dc',
    },
    Modal: {
      contentBg: '#fffdf9',
      headerBg: '#fffdf9',
      titleFontSize: 20,
    },
    Table: {
      headerBg: '#f7f2e8',
      headerColor: '#7c776c',
      borderColor: '#eee8dc',
      rowHoverBg: '#faf6ee',
      cellPaddingBlock: 11,
      cellPaddingInline: 12,
    },
    Segmented: {
      itemSelectedBg: '#1d1e1b',
      itemSelectedColor: '#fbf7ed',
      trackBg: '#efe9dd',
    },
    Switch: {
      colorPrimary: '#2f6b58',
    },
    Message: {
      contentBg: '#1d1e1b',
    },
    Tooltip: {
      colorBgSpotlight: '#1d1e1b',
    },
    Empty: {
      colorTextDescription: '#a7a196',
    },
  },
};
