# 🌿 RNCanopy Registry

Official component registry for the RNCanopy React Native component library.

## 📋 Registry Contents

### 🧩 Components (11)
- **Forms**: Button, Input, Switch, Slider, Toggle, GradientButton
- **Feedback**: Alert, Toast, Badge  
- **Layout**: Card
- **Loading**: Spinner

### 🎨 Templates (4)
- **🌟 Canopy** - Modern, balanced palette (default)
- **🌙 Dusk** - Dark, moody palette for immersive UIs
- **☀️ Sunbeam** - Warm, light-friendly with pastel accents
- **🏢 Slate** - Professional, neutral tone for dashboards

### ⚙️ Providers (3)
- ThemeProvider - Light/dark mode management
- HapticsProvider - Haptic feedback integration
- RNCanopyProvider - Complete provider wrapper

## 📡 API Endpoints

### Components API
```
GET https://registry.rncanopy.dev/api/components.json
```

### Templates API  
```
GET https://registry.rncanopy.dev/api/templates.json
```

### Direct File Access
```
GET https://raw.githubusercontent.com/rncanopy/registry/main/components/button/component.tsx.template
GET https://raw.githubusercontent.com/rncanopy/registry/main/templates/dusk/colors.json
```

## 🏗️ Registry Structure

```
registry/
├── api/
│   ├── components.json          # Component registry
│   └── templates.json           # Template registry
├── components/
│   ├── button/
│   │   ├── component.tsx.template
│   │   ├── component.json
│   │   └── examples/
│   └── ...
├── templates/
│   ├── canopy/
│   │   ├── colors.json
│   │   └── metadata.json
│   └── ...
└── providers/
    ├── ThemeProvider.tsx.template
    └── ...
```

## 🔄 Automatic Updates

The registry is automatically updated via GitHub Actions when:
- Component files are modified
- Template definitions change
- New components are added

## 📦 Usage

This registry is consumed by the RNCanopy CLI:

```bash
npx @rncanopy/cli init my-app --template dusk
npx @rncanopy/cli add button input alert
```

## 🤝 Contributing

1. Fork the repository
2. Add your component in the appropriate directory
3. Include proper metadata in `component.json`
4. Submit a pull request

Components must follow the RNCanopy component guidelines and pass automated validation.

## 📄 License

MIT - See LICENSE file for details.