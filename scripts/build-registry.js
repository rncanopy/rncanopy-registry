#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const EXPO_PATH = path.join(__dirname, '../..');
const REGISTRY_PATH = path.join(__dirname, '..');

// Registry configuration
const REGISTRY_CONFIG = {
  baseUrl: 'https://raw.githubusercontent.com/rncanopy/rncanopy-registry/main',
  version: '1.0.0',
  lastUpdated: new Date().toISOString(),
};

function analyzeComponentFile(filePath, componentName) {
  const content = fs.readFileSync(filePath, 'utf8');
  const analysis = {
    dependencies: new Set(),
    exports: new Set(),
    props: new Set(),
    variants: new Set(),
    sizes: new Set(),
    hasHaptics: false,
    hasProvider: false,
    tokenUsage: new Set()
  };

  // Extract imports and dependencies
  const importMatches = content.match(/import.*from\s+['"]([^'"]+)['"];?/g) || [];
  importMatches.forEach(match => {
    const packageMatch = match.match(/from\s+['"]([^'"]+)['"]/);
    if (packageMatch) {
      const pkg = packageMatch[1];
      if (!pkg.startsWith('.') && !pkg.startsWith('react-native/')) {
        if (pkg !== 'react' && pkg !== 'react-native') {
          analysis.dependencies.add(pkg);
        }
      }
    }
  });

  // Extract exports
  const exportMatches = content.match(/export\s+(interface|type|function|const)\s+([A-Za-z0-9_]+)/g) || [];
  exportMatches.forEach(match => {
    const nameMatch = match.match(/export\s+(?:interface|type|function|const)\s+([A-Za-z0-9_]+)/);
    if (nameMatch) {
      analysis.exports.add(nameMatch[1]);
    }
  });

  // Extract variants and sizes
  const variantTypes = content.match(/type\s+\w*Variant\s*=\s*['"][^'"]+['"](?:\s*\|\s*['"][^'"]+['"])*/g) || [];
  variantTypes.forEach(match => {
    const variants = match.match(/['"]([^'"]+)['"]/g) || [];
    variants.forEach(v => analysis.variants.add(v.replace(/['"]/g, '')));
  });

  const sizeTypes = content.match(/type\s+\w*Size\s*=\s*['"][^'"]+['"](?:\s*\|\s*['"][^'"]+['"])*/g) || [];
  sizeTypes.forEach(match => {
    const sizes = match.match(/['"]([^'"]+)['"]/g) || [];
    sizes.forEach(s => analysis.sizes.add(s.replace(/['"]/g, '')));
  });

  // Check for haptics and providers
  analysis.hasHaptics = content.includes('useHaptics') || content.includes('triggerHaptic');
  analysis.hasProvider = content.includes('useTheme') || content.includes('useHaptics');

  // Extract token usage
  const tokenMatches = content.match(/(?:colors|spacing|radii|borders|typography|iconSizes|opacity|shadows|haptics)\.[\w.\[\]]+/g) || [];
  tokenMatches.forEach(token => analysis.tokenUsage.add(token));

  return {
    dependencies: Array.from(analysis.dependencies),
    exports: Array.from(analysis.exports),
    variants: Array.from(analysis.variants),
    sizes: Array.from(analysis.sizes),
    hasHaptics: analysis.hasHaptics,
    hasProvider: analysis.hasProvider,
    tokenUsage: Array.from(analysis.tokenUsage),
    checksum: crypto.createHash('md5').update(content).digest('hex')
  };
}

function buildComponentRegistry() {
  console.log('🧩 Building comprehensive component registry...');
  
  const components = [];
  const componentsDir = path.join(REGISTRY_PATH, 'components');
  
  // Ensure components directory exists
  if (!fs.existsSync(componentsDir)) {
    fs.mkdirSync(componentsDir, { recursive: true });
  }
  
  // Get component files from Expo app (source of truth)
  const expoComponentsDir = path.join(EXPO_PATH, 'components/ui');
  const componentFiles = fs.readdirSync(expoComponentsDir)
    .filter(file => file.endsWith('.tsx') && !file.includes('index'))
    .map(file => file.replace('.tsx', ''));
  
  componentFiles.forEach(componentName => {
    const componentDir = path.join(componentsDir, componentName);
    if (!fs.existsSync(componentDir)) {
      fs.mkdirSync(componentDir, { recursive: true });
    }
    
    // Copy and analyze component
    const sourceFile = path.join(expoComponentsDir, `${componentName}.tsx`);
    const targetFile = path.join(componentDir, 'component.tsx.template');
    
    if (fs.existsSync(sourceFile)) {
      const content = fs.readFileSync(sourceFile, 'utf8');
      // Convert to template by replacing relative imports
      const templateContent = content
        .replace(/from '\.\.\//g, "from '../")
        .replace(/from '\.\/'/g, "from './")
        .replace(/\.\.\/\.\.\/constants\/ui/g, './constants/ui')
        .replace(/\.\.\/\.\.\/providers/g, './providers');
      
      fs.writeFileSync(targetFile, templateContent);
      
      // Analyze component for metadata
      const analysis = analyzeComponentFile(sourceFile, componentName);
      
      // Create comprehensive metadata
      const metadata = createComponentMetadata(componentName, analysis);
      fs.writeFileSync(
        path.join(componentDir, 'component.json'),
        JSON.stringify(metadata, null, 2)
      );
      
      components.push(metadata);
      console.log(`  ✅ ${componentName} (${analysis.exports.length} exports, ${analysis.dependencies.length} deps)`);
    }
  });
  
  // Generate components API with enhanced metadata
  const api = {
    version: REGISTRY_CONFIG.version,
    lastUpdated: REGISTRY_CONFIG.lastUpdated,
    baseUrl: REGISTRY_CONFIG.baseUrl,
    components,
    stats: {
      totalComponents: components.length,
      categories: [...new Set(components.map(c => c.category))],
      totalDependencies: [...new Set(components.flatMap(c => c.dependencies))].length
    }
  };
  
  fs.writeFileSync(
    path.join(REGISTRY_PATH, 'api/components.json'),
    JSON.stringify(api, null, 2)
  );
  
  console.log(`📦 Generated ${components.length} components with full analysis`);
  return components;
}

function buildTemplateRegistry() {
  console.log('🎨 Building comprehensive template registry...');
  
  const templates = [];
  const templatesDir = path.join(REGISTRY_PATH, 'templates');
  
  // Ensure templates directory exists
  if (!fs.existsSync(templatesDir)) {
    fs.mkdirSync(templatesDir, { recursive: true });
    console.log('Created templates directory');
    return templates;
  }
  
  // Get template directories that contain template.json
  const templateDirs = fs.readdirSync(templatesDir)
    .filter(dir => fs.statSync(path.join(templatesDir, dir)).isDirectory())
    .filter(dir => fs.existsSync(path.join(templatesDir, dir, 'template.json')));
  
  templateDirs.forEach(templateName => {
    const templateDir = path.join(templatesDir, templateName);
    const templatePath = path.join(templateDir, 'template.json');
    
    try {
      console.log(`  📋 Processing template: ${templateName}`);
      
      // Load template definition
      const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
      
      // Validate template has required structure
      if (!template.tokens || !template.tokens.colors) {
        console.warn(`  ⚠️  Template ${templateName} missing required tokens.colors`);
        return;
      }
      
      // Generate individual token files for CLI consumption
      const tokenTypes = Object.keys(template.tokens);
      const generatedFiles = [];
      
      tokenTypes.forEach(tokenType => {
        const tokenData = template.tokens[tokenType];
        const tokenFile = `${tokenType}.json`;
        const tokenPath = path.join(templateDir, tokenFile);
        
        fs.writeFileSync(tokenPath, JSON.stringify(tokenData, null, 2));
        generatedFiles.push(tokenFile);
      });
      
      // Generate metadata with comprehensive URLs
      const templateMetadata = {
        name: template.name,
        displayName: template.displayName,
        description: template.description,
        author: template.author,
        version: template.version,
        lastUpdated: REGISTRY_CONFIG.lastUpdated,
        personality: template.personality,
        preview: template.preview,
        tokenFiles: generatedFiles.map(file => ({
          type: file.replace('.json', ''),
          url: `${REGISTRY_CONFIG.baseUrl}/templates/${templateName}/${file}`,
          checksum: crypto.createHash('md5').update(JSON.stringify(template.tokens[file.replace('.json', '')])).digest('hex')
        })),
        templateUrl: `${REGISTRY_CONFIG.baseUrl}/templates/${templateName}/template.json`,
        metadataUrl: `${REGISTRY_CONFIG.baseUrl}/templates/${templateName}/metadata.json`,
        checksum: crypto.createHash('md5').update(JSON.stringify(template)).digest('hex')
      };
      
      // Write metadata file
      fs.writeFileSync(
        path.join(templateDir, 'metadata.json'),
        JSON.stringify(templateMetadata, null, 2)
      );
      
      templates.push(templateMetadata);
      console.log(`  ✅ ${template.displayName} (${generatedFiles.length} token files: ${generatedFiles.join(', ')})`);
      
    } catch (error) {
      console.error(`  ❌ Error processing template ${templateName}:`, error.message);
    }
  });
  
  // Generate comprehensive templates API
  const api = {
    version: REGISTRY_CONFIG.version,
    lastUpdated: REGISTRY_CONFIG.lastUpdated,
    baseUrl: REGISTRY_CONFIG.baseUrl,
    templates,
    stats: {
      totalTemplates: templates.length,
      availableThemes: templates.map(t => t.name),
      tokenTypes: templates.length > 0 ? templates[0].tokenFiles.map(tf => tf.type) : [],
      personalities: [...new Set(templates.map(t => `${t.personality.mood}-${t.personality.spacing}-${t.personality.roundness}`))]
    }
  };
  
  fs.writeFileSync(
    path.join(REGISTRY_PATH, 'api/templates.json'),
    JSON.stringify(api, null, 2)
  );
  
  console.log(`🎨 Generated ${templates.length} comprehensive templates with full token support`);
  return templates;
}

function buildProviderRegistry() {
  console.log('⚙️  Building comprehensive provider registry...');
  
  const providers = [];
  const providersDir = path.join(REGISTRY_PATH, 'providers');
  
  // Ensure providers directory exists
  if (!fs.existsSync(providersDir)) {
    fs.mkdirSync(providersDir, { recursive: true });
  }
  
  // Get providers from expo app (source of truth)
  const expoProvidersDir = path.join(EXPO_PATH, 'providers');
  const providerFiles = fs.readdirSync(expoProvidersDir)
    .filter(file => file.endsWith('.tsx') && !file.includes('index'));
  
  providerFiles.forEach(file => {
    const providerName = file.replace('.tsx', '');
    const sourcePath = path.join(expoProvidersDir, file);
    const targetPath = path.join(providersDir, `${providerName}.tsx.template`);
    
    if (fs.existsSync(sourcePath)) {
      const content = fs.readFileSync(sourcePath, 'utf8');
      // Convert to template
      const templateContent = content
        .replace(/from '\.\.\//g, "from '../")
        .replace(/\.\.\/constants\/ui/g, './constants/ui');
      
      fs.writeFileSync(targetPath, templateContent);
      
      // Analyze provider
      const analysis = analyzeComponentFile(sourcePath, providerName);
      
      const providerMetadata = {
        name: providerName.toLowerCase(),
        displayName: providerName,
        description: `${providerName} context provider`,
        dependencies: analysis.dependencies,
        exports: analysis.exports,
        version: REGISTRY_CONFIG.version,
        checksum: analysis.checksum,
        downloadUrl: `${REGISTRY_CONFIG.baseUrl}/providers/${providerName}.tsx.template`
      };
      
      // Create metadata file
      fs.writeFileSync(
        path.join(providersDir, `${providerName}.json`),
        JSON.stringify(providerMetadata, null, 2)
      );
      
      providers.push(providerMetadata);
      console.log(`  ✅ ${providerName} (${analysis.exports.length} exports)`);
    }
  });
  
  // Generate providers API
  const api = {
    version: REGISTRY_CONFIG.version,
    lastUpdated: REGISTRY_CONFIG.lastUpdated,
    baseUrl: REGISTRY_CONFIG.baseUrl,
    providers,
    stats: {
      totalProviders: providers.length
    }
  };
  
  fs.writeFileSync(
    path.join(REGISTRY_PATH, 'api/providers.json'),
    JSON.stringify(api, null, 2)
  );
  
  console.log(`⚙️  Generated ${providers.length} enhanced providers`);
  return providers;
}

function createComponentMetadata(componentName, analysis) {
  const baseCategories = {
    button: 'forms',
    gradientbutton: 'forms', 
    input: 'forms',
    switch: 'forms',
    slider: 'forms',
    toggle: 'forms',
    alert: 'feedback',
    toast: 'feedback',
    badge: 'feedback',
    card: 'layout',
    spinner: 'loading'
  };

  const baseDescriptions = {
    button: 'Customizable button component with multiple variants, sizes, and loading states',
    gradientbutton: 'Button component with gradient backgrounds and advanced styling',
    input: 'Text input component with validation states and helper text',
    switch: 'Toggle control with smooth animations and haptic feedback', 
    slider: 'Range input control with customizable styling',
    toggle: 'Button-like toggle component with pressed states',
    alert: 'Inline feedback messages with multiple variants',
    toast: 'Overlay notifications with positioning and animations',
    badge: 'Status indicators and labels with multiple variants',
    card: 'Container component with elevation and customizable styling',
    spinner: 'Loading indicators with multiple styles and sizes'
  };

  const normalizedName = componentName.toLowerCase();
  const displayName = componentName.charAt(0).toUpperCase() + componentName.slice(1);

  // Determine required providers
  const requiredProviders = [];
  if (analysis.hasHaptics) {
    requiredProviders.push('HapticsProvider');
  }
  if (analysis.hasProvider) {
    requiredProviders.push('ThemeProvider');
  }

  return {
    name: normalizedName,
    displayName: normalizedName === 'gradientbutton' ? 'Gradient Button' : displayName,
    description: baseDescriptions[normalizedName] || `${displayName} component`,
    category: baseCategories[normalizedName] || 'forms',
    dependencies: analysis.dependencies,
    requiredProviders,
    files: ['component.tsx.template'],
    exports: analysis.exports,
    variants: analysis.variants,
    sizes: analysis.sizes,
    tokenUsage: analysis.tokenUsage,
    hasHaptics: analysis.hasHaptics,
    version: REGISTRY_CONFIG.version,
    checksum: analysis.checksum,
    downloadUrl: `${REGISTRY_CONFIG.baseUrl}/components/${normalizedName}/component.tsx.template`,
    metadataUrl: `${REGISTRY_CONFIG.baseUrl}/components/${normalizedName}/component.json`
  };
}


function buildTokenRegistry() {
  console.log('🎨 Building token registry...');
  
  const tokensDir = path.join(REGISTRY_PATH, 'tokens');
  const expoConstantsDir = path.join(EXPO_PATH, 'constants/ui');
  
  // Ensure tokens directory exists
  if (!fs.existsSync(tokensDir)) {
    fs.mkdirSync(tokensDir, { recursive: true });
  }
  
  const tokens = [];
  const tokenFiles = fs.readdirSync(expoConstantsDir)
    .filter(file => file.endsWith('.ts') && !file.includes('index'));
  
  tokenFiles.forEach(file => {
    const tokenName = file.replace('.ts', '');
    const sourcePath = path.join(expoConstantsDir, file);
    const targetPath = path.join(tokensDir, `${tokenName}.ts.template`);
    
    if (fs.existsSync(sourcePath)) {
      const content = fs.readFileSync(sourcePath, 'utf8');
      fs.writeFileSync(targetPath, content);
      
      const tokenMetadata = {
        name: tokenName,
        description: `${tokenName} design tokens`,
        version: REGISTRY_CONFIG.version,
        checksum: crypto.createHash('md5').update(content).digest('hex'),
        downloadUrl: `${REGISTRY_CONFIG.baseUrl}/tokens/${tokenName}.ts.template`
      };
      
      tokens.push(tokenMetadata);
      console.log(`  ✅ ${tokenName}`);
    }
  });
  
  // Generate tokens API
  const api = {
    version: REGISTRY_CONFIG.version,
    lastUpdated: REGISTRY_CONFIG.lastUpdated,
    baseUrl: REGISTRY_CONFIG.baseUrl,
    tokens,
    stats: {
      totalTokens: tokens.length
    }
  };
  
  fs.writeFileSync(
    path.join(REGISTRY_PATH, 'api/tokens.json'),
    JSON.stringify(api, null, 2)
  );
  
  console.log(`🎨 Generated ${tokens.length} token files`);
  return tokens;
}

function buildRegistryIndex(components, templates, providers, tokens) {
  console.log('📋 Building registry index...');
  
  const index = {
    version: REGISTRY_CONFIG.version,
    lastUpdated: REGISTRY_CONFIG.lastUpdated,
    baseUrl: REGISTRY_CONFIG.baseUrl,
    stats: {
      components: components.length,
      templates: templates.length,
      providers: providers.length,
      tokens: tokens.length,
      totalDependencies: [...new Set(components.flatMap(c => c.dependencies))].length
    },
    endpoints: {
      components: `${REGISTRY_CONFIG.baseUrl}/api/components.json`,
      templates: `${REGISTRY_CONFIG.baseUrl}/api/templates.json`,
      providers: `${REGISTRY_CONFIG.baseUrl}/api/providers.json`,
      tokens: `${REGISTRY_CONFIG.baseUrl}/api/tokens.json`
    },
    categories: [...new Set(components.map(c => c.category))],
    dependencies: [...new Set(components.flatMap(c => c.dependencies))].sort()
  };
  
  fs.writeFileSync(
    path.join(REGISTRY_PATH, 'api/index.json'),
    JSON.stringify(index, null, 2)
  );
  
  console.log('📋 Registry index created');
  return index;
}

async function main() {
  console.log('🏗️  Building Complete RNCanopy Registry...\n');
  
  // Ensure API directory exists
  const apiDir = path.join(REGISTRY_PATH, 'api');
  if (!fs.existsSync(apiDir)) {
    fs.mkdirSync(apiDir, { recursive: true });
  }
  
  // Build all registries with enhanced analysis
  const components = buildComponentRegistry();
  console.log();
  const templates = buildTemplateRegistry();
  console.log();
  const providers = buildProviderRegistry();
  console.log();
  const tokens = buildTokenRegistry();
  console.log();
  const index = buildRegistryIndex(components, templates, providers, tokens);
  
  console.log('\n🎉 Complete Registry Build Finished!');
  console.log(`📁 Registry: ${REGISTRY_PATH}`);
  console.log(`🌐 Base URL: ${REGISTRY_CONFIG.baseUrl}`);
  console.log(`📊 Stats: ${index.stats.components} components, ${index.stats.templates} templates, ${index.stats.providers} providers, ${index.stats.tokens} tokens`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { 
  buildComponentRegistry, 
  buildTemplateRegistry, 
  buildProviderRegistry, 
  buildTokenRegistry,
  buildRegistryIndex,
  analyzeComponentFile,
  createComponentMetadata,
  REGISTRY_CONFIG
};