# Paily Frontend

> [!IMPORTANT]
> **本仓库为 Paily Connect 开源仓库的一部分**
>
> 关于 Paily Connect 开源仓库的更多信息，请查看 [此页面](https://github.com/openpaily/paily-core) 。
> 
> Paily Connect 系列是我们的内部项目，其仍处于早期开发阶段。
> **我们极度不建议您直接部署此版本**。该版本可能会有潜在的未知问题并可能造成数据丢失等异常，我们建议您等待可用的分支版本部署。

Paily 管理界面是 Paily Connect 平台的 Web 控制台。它通过 HTTP API 连接 **Paily 主服务**（`paily-core`），用于管理来源与节点、查看测活结果、配置分发格式与运行参数，并复制公开订阅链接。

![Paily 管理界面预览](<images/image (1).png>)

更多截图：[预览 2](<images/image (2).png>) · [预览 3](<images/image (3).png>) · [预览 4](<images/image (4).png>)

## 在平台中的位置

管理界面只负责展示与配置，不参与抓取、测活和分发：

```text
   管理员
      │
      ▼
 Paily 管理界面  ──HTTP API──▶  Paily 主服务
                                源库 · 节点池 · 配置 · 分发
```

抓取由 **Paily Fetch**（`paily-fetch`）执行，测活由 **Paily 测活后端**（`paily-check`）执行，两者都不在本仓库内。

## 功能

| 页面 | 功能 |
| --- | --- |
| 仪表盘 | 查看节点、存活节点、来源和死源数量，复制基础订阅链接。 |
| 来源管理 | 创建、编辑、删除来源，设置 `ignore_dead`，查看抓取记录与关联节点。 |
| 节点管理 | 按状态、地区、协议、来源、评分、流媒体能力和测活 tag 筛选节点，查看详情与测活历史。 |
| Sponsor 管理 | 配置匹配规则、显示文本和优先级。 |
| 过滤测试台 | 在真实节点或来源上预览表达式匹配结果。 |
| 运行时配置 | 修改评分、分发、历史保留和命名等动态参数。 |
| 格式配置 | 修改 Clash、Sing-box、Base64 的格式生成配置。 |
| 日志 | 查看抓取日志和初筛检测日志。 |

管理员使用密码登录 Paily 主服务，界面保存短期 access token 并在过期时自动刷新。

## 技术栈

- Vue 3 + TypeScript
- Vite
- Vue Router + Pinia
- Element Plus
- Axios
- ECharts

## 前置条件

- Node.js 22 或更高版本
- 可访问的 Paily 主服务 API

## 快速开始

安装依赖：

```sh
npm ci
```

创建 `.env.development.local`，填入 Paily 主服务地址：

```dotenv
VITE_API_BASE=http://localhost:21380
```

启动开发服务器：

```sh
npm run dev
```

开发服务器会把 `/api`、`/clash`、`/singbox` 和 `/base64` 请求代理到 `VITE_API_BASE`。

## 构建与部署

生产构建：

```sh
npm run build
```

构建产物位于 `dist/`，可部署到任意静态文件服务。构建时需要设置 `VITE_API_BASE`。

`VITE_API_BASE` 是 Paily 主服务基础地址，不包含 `/api/v1` 路径。

界面使用 SPA 页面，部署平台必须将未匹配静态文件的请求重写到 `/index.html`，否则直接访问或刷新 `/nodes`、`/sources` 等路由会返回 404。

Nginx 示例：

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

Vercel 部署时，仓库中的 `vercel.json` 已包含重写规则；在项目的环境变量中添加 `VITE_API_BASE` 后部署即可。

跨域策略请在 Paily 主服务配置。

## 可用脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发服务器。 |
| `npm run type-check` | 执行 TypeScript 类型检查。 |
| `npm run build` | 构建生产产物。 |
| `npm run preview` | 本地预览生产构建。 |

## 许可证

本项目基于 GNU Affero General Public License v3.0（AGPL-3.0）发布，详见 [LICENSE](LICENSE)。
