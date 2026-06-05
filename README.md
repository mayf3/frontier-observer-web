# 前沿观察展示网站

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

纯静态网站，用于展示前沿观察员同步出的日报、周报、专题和思想者档案。

## 使用

```bash
node sync-data.mjs
python3 -m http.server 8088
```

访问：

```text
http://localhost:8088/
```

## 数据同步

默认源目录：

```text
WORKSPACE_DIR 环境变量
```

重新同步时只需要运行：

```bash
node sync-data.mjs
```

也可以分别指定源目录：

```bash
REPORT_ROOT=/path/to/reports CANDIDATES_ROOT=/path/to/candidates node sync-data.mjs
```
