#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');

const REGISTRY_PATH = path.join(__dirname, '..');
const SCHEMA_PATH = path.join(REGISTRY_PATH, 'schemas', 'template.schema.json');

function validateTemplate(templatePath) {
  try {
    // Load schema
    const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
    const ajv = new Ajv({ allErrors: true });
    const validate = ajv.compile(schema);
    
    // Load template
    const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
    
    // Validate
    const valid = validate(template);
    
    if (!valid) {
      console.error(`❌ Template validation failed: ${templatePath}`);
      validate.errors.forEach(error => {
        console.error(`  - ${error.instancePath}: ${error.message}`);
      });
      return false;
    }
    
    console.log(`✅ Template valid: ${template.name}`);
    return true;
  } catch (error) {
    console.error(`❌ Template validation error: ${error.message}`);
    return false;
  }
}

function validateAllTemplates() {
  console.log('🔍 Validating all templates...\n');
  
  const templatesDir = path.join(REGISTRY_PATH, 'templates');
  let allValid = true;
  
  if (!fs.existsSync(templatesDir)) {
    console.log('No templates directory found. Creating...');
    fs.mkdirSync(templatesDir, { recursive: true });
    return true;
  }
  
  const templateDirs = fs.readdirSync(templatesDir)
    .filter(dir => fs.statSync(path.join(templatesDir, dir)).isDirectory());
  
  for (const templateDir of templateDirs) {
    const templatePath = path.join(templatesDir, templateDir, 'template.json');
    if (fs.existsSync(templatePath)) {
      const isValid = validateTemplate(templatePath);
      allValid = allValid && isValid;
    } else {
      console.error(`❌ Missing template.json: ${templateDir}`);
      allValid = false;
    }
  }
  
  if (allValid) {
    console.log('\n✅ All templates are valid!');
  } else {
    console.log('\n❌ Some templates failed validation');
    process.exit(1);
  }
  
  return allValid;
}

module.exports = { validateTemplate, validateAllTemplates };

if (require.main === module) {
  validateAllTemplates();
}