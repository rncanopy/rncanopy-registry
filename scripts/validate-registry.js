#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REGISTRY_PATH = path.join(__dirname, '..');

function validateRegistryStructure() {
  console.log('🔍 Validating registry structure...');
  
  const requiredDirs = ['api', 'components', 'templates', 'providers', 'tokens'];
  const requiredFiles = [
    'api/index.json',
    'api/components.json', 
    'api/templates.json',
    'api/providers.json',
    'api/tokens.json'
  ];
  
  let isValid = true;
  
  // Check directories
  requiredDirs.forEach(dir => {
    const dirPath = path.join(REGISTRY_PATH, dir);
    if (!fs.existsSync(dirPath)) {
      console.error(`❌ Missing directory: ${dir}`);
      isValid = false;
    } else {
      console.log(`✅ Directory exists: ${dir}`);
    }
  });
  
  // Check API files
  requiredFiles.forEach(file => {
    const filePath = path.join(REGISTRY_PATH, file);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Missing file: ${file}`);
      isValid = false;
    } else {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        JSON.parse(content); // Validate JSON
        console.log(`✅ Valid JSON file: ${file}`);
      } catch (error) {
        console.error(`❌ Invalid JSON in: ${file} - ${error.message}`);
        isValid = false;
      }
    }
  });
  
  return isValid;
}

function validateComponents() {
  console.log('\n🧩 Validating components...');
  
  const componentsPath = path.join(REGISTRY_PATH, 'api/components.json');
  if (!fs.existsSync(componentsPath)) {
    console.error('❌ Components API file missing');
    return false;
  }
  
  try {
    const componentsData = JSON.parse(fs.readFileSync(componentsPath, 'utf8'));
    const components = componentsData.components || componentsData;
    
    if (!Array.isArray(components)) {
      console.error('❌ Components data is not an array');
      return false;
    }
    
    let isValid = true;
    
    components.forEach(component => {
      const requiredFields = ['name', 'displayName', 'description', 'category', 'dependencies', 'exports', 'version'];
      
      requiredFields.forEach(field => {
        if (!component.hasOwnProperty(field)) {
          console.error(`❌ Component ${component.name || 'unknown'} missing field: ${field}`);
          isValid = false;
        }
      });
      
      // Check component directory and files exist
      const componentDir = path.join(REGISTRY_PATH, 'components', component.name);
      if (!fs.existsSync(componentDir)) {
        console.error(`❌ Component directory missing: ${component.name}`);
        isValid = false;
      } else {
        const templateFile = path.join(componentDir, 'component.tsx.template');
        const metadataFile = path.join(componentDir, 'component.json');
        
        if (!fs.existsSync(templateFile)) {
          console.error(`❌ Component template missing: ${component.name}/component.tsx.template`);
          isValid = false;
        }
        
        if (!fs.existsSync(metadataFile)) {
          console.error(`❌ Component metadata missing: ${component.name}/component.json`);
          isValid = false;
        }
      }
      
      if (isValid) {
        console.log(`✅ Component valid: ${component.name}`);
      }
    });
    
    console.log(`📊 Total components: ${components.length}`);
    return isValid;
    
  } catch (error) {
    console.error(`❌ Error validating components: ${error.message}`);
    return false;
  }
}

function validateTemplates() {
  console.log('\n🎨 Validating templates...');
  
  const templatesPath = path.join(REGISTRY_PATH, 'api/templates.json');
  if (!fs.existsSync(templatesPath)) {
    console.error('❌ Templates API file missing');
    return false;
  }
  
  try {
    const templatesData = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));
    const templates = templatesData.templates || templatesData;
    
    if (!Array.isArray(templates)) {
      console.error('❌ Templates data is not an array');
      return false;
    }
    
    let isValid = true;
    
    templates.forEach(template => {
      const requiredFields = ['name', 'displayName', 'description', 'version'];
      
      requiredFields.forEach(field => {
        if (!template.hasOwnProperty(field)) {
          console.error(`❌ Template ${template.name || 'unknown'} missing field: ${field}`);
          isValid = false;
        }
      });
      
      // Check template directory and files exist
      const templateDir = path.join(REGISTRY_PATH, 'templates', template.name);
      if (!fs.existsSync(templateDir)) {
        console.error(`❌ Template directory missing: ${template.name}`);
        isValid = false;
      } else {
        const colorsFile = path.join(templateDir, 'colors.json');
        const metadataFile = path.join(templateDir, 'metadata.json');
        
        if (!fs.existsSync(colorsFile)) {
          console.error(`❌ Template colors missing: ${template.name}/colors.json`);
          isValid = false;
        } else {
          try {
            JSON.parse(fs.readFileSync(colorsFile, 'utf8'));
          } catch (error) {
            console.error(`❌ Invalid colors JSON: ${template.name}/colors.json`);
            isValid = false;
          }
        }
        
        if (!fs.existsSync(metadataFile)) {
          console.error(`❌ Template metadata missing: ${template.name}/metadata.json`);
          isValid = false;
        }
      }
      
      if (isValid) {
        console.log(`✅ Template valid: ${template.name}`);
      }
    });
    
    console.log(`📊 Total templates: ${templates.length}`);
    return isValid;
    
  } catch (error) {
    console.error(`❌ Error validating templates: ${error.message}`);
    return false;
  }
}

function validateDependencies() {
  console.log('\n📦 Validating dependencies...');
  
  const componentsPath = path.join(REGISTRY_PATH, 'api/components.json');
  if (!fs.existsSync(componentsPath)) {
    return false;
  }
  
  try {
    const componentsData = JSON.parse(fs.readFileSync(componentsPath, 'utf8'));
    const components = componentsData.components || componentsData;
    
    const allDependencies = new Set();
    const dependencyGraph = new Map();
    
    components.forEach(component => {
      component.dependencies.forEach(dep => {
        allDependencies.add(dep);
      });
      
      if (component.requiredProviders) {
        component.requiredProviders.forEach(provider => {
          if (!dependencyGraph.has(component.name)) {
            dependencyGraph.set(component.name, []);
          }
          dependencyGraph.get(component.name).push(provider);
        });
      }
    });
    
    console.log(`📊 Unique dependencies: ${allDependencies.size}`);
    console.log(`🔗 Components with provider dependencies: ${dependencyGraph.size}`);
    
    // List all dependencies
    Array.from(allDependencies).sort().forEach(dep => {
      console.log(`  📦 ${dep}`);
    });
    
    return true;
    
  } catch (error) {
    console.error(`❌ Error validating dependencies: ${error.message}`);
    return false;
  }
}

function generateRegistryReport() {
  console.log('\n📊 Generating registry report...');
  
  try {
    const indexPath = path.join(REGISTRY_PATH, 'api/index.json');
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    
    const report = {
      timestamp: new Date().toISOString(),
      version: index.version,
      stats: index.stats,
      categories: index.categories,
      dependencies: index.dependencies.length,
      structure: {
        hasComponents: fs.existsSync(path.join(REGISTRY_PATH, 'components')),
        hasTemplates: fs.existsSync(path.join(REGISTRY_PATH, 'templates')),
        hasProviders: fs.existsSync(path.join(REGISTRY_PATH, 'providers')),
        hasTokens: fs.existsSync(path.join(REGISTRY_PATH, 'tokens')),
      }
    };
    
    console.log('📋 Registry Report:');
    console.log(`   Version: ${report.version}`);
    console.log(`   Components: ${report.stats.components}`);
    console.log(`   Templates: ${report.stats.templates}`);
    console.log(`   Providers: ${report.stats.providers}`);
    console.log(`   Tokens: ${report.stats.tokens}`);
    console.log(`   Dependencies: ${report.dependencies}`);
    console.log(`   Categories: ${report.categories.join(', ')}`);
    
    return report;
    
  } catch (error) {
    console.error(`❌ Error generating report: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('🔍 RNCanopy Registry Validation\n');
  
  let isValid = true;
  
  isValid &= validateRegistryStructure();
  isValid &= validateComponents();
  isValid &= validateTemplates();
  isValid &= validateDependencies();
  
  const report = generateRegistryReport();
  
  if (isValid) {
    console.log('\n✅ Registry validation passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Registry validation failed!');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  validateRegistryStructure,
  validateComponents, 
  validateTemplates,
  validateDependencies,
  generateRegistryReport
};