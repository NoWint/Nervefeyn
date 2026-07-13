# Astro + React + TypeScript + shadcn/ui

这是一个内置 React、TypeScript 与 shadcn/ui 的 Astro 项目模板。

## 添加组件

运行以下命令为应用添加组件:

```bash
npx shadcn@latest add button
```

该命令会将 UI 组件放入 `src/components` 目录。

## 使用组件

在 `.astro` 文件中导入并使用组件:

```astro
---
import { Button } from "@/components/ui/button"
---

<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>Astro App</title>
  </head>
  <body>
    <div class="grid h-screen place-items-center content-center">
      <Button>Button</Button>
    </div>
  </body>
</html>
```
