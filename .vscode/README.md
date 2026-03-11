# VSCode Configuration

This project includes VSCode workspace configuration to enhance your development experience.

## Opening the Project in VSCode

### Option 1: Open the Workspace File
1. Double-click on `control-panel.code-workspace` file
2. Or in VSCode: File → Open Workspace from File → Select `control-panel.code-workspace`

### Option 2: Open the Folder
1. In VSCode: File → Open Folder → Select the project directory
2. VSCode will automatically use the `.vscode` settings

## What's Included

### Recommended Extensions
When you open this project, VSCode will suggest installing these extensions:
- **ESLint** - JavaScript/TypeScript linting
- **Prettier** - Code formatting
- **Tailwind CSS IntelliSense** - Tailwind class autocomplete
- **TypeScript and JavaScript Language Features** - Enhanced TypeScript support
- **Auto Rename Tag** - Automatically rename paired HTML/JSX tags
- **Path Intellisense** - File path autocomplete
- **Supabase** - Supabase integration

### Editor Settings
- **Format on Save**: Enabled with Prettier
- **ESLint Auto-fix**: Enabled on save
- **TypeScript**: Configured to use the workspace version
- **File Exclusions**: Hides `.next`, `node_modules` from the explorer
- **Tailwind CSS**: Enhanced IntelliSense support

### Debug Configurations
Three debug configurations are available (Run → Start Debugging):
1. **Next.js: debug server-side** - Debug server-side code
2. **Next.js: debug client-side** - Debug in Chrome browser
3. **Next.js: debug full stack** - Debug both server and client

## Quick Start

1. Install recommended extensions when prompted
2. Run `npm install` to install dependencies
3. Press `F5` to start debugging or run `npm run dev` in the terminal
4. Happy coding! 🚀

## Arabic Guide / دليل باللغة العربية

### فتح المشروع في VSCode

#### الخيار 1: فتح ملف مساحة العمل
1. انقر نقرًا مزدوجًا على ملف `control-panel.code-workspace`
2. أو في VSCode: ملف ← فتح مساحة عمل من ملف ← اختر `control-panel.code-workspace`

#### الخيار 2: فتح المجلد
1. في VSCode: ملف ← فتح مجلد ← اختر مجلد المشروع
2. سيستخدم VSCode تلقائيًا إعدادات `.vscode`

### الإضافات الموصى بها
عند فتح هذا المشروع، سيقترح VSCode تثبيت الإضافات اللازمة للتطوير.

### بدء سريع
1. قم بتثبيت الإضافات الموصى بها عند المطالبة
2. قم بتشغيل `npm install` لتثبيت التبعيات
3. اضغط `F5` لبدء التصحيح أو قم بتشغيل `npm run dev` في الطرفية
