#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const CLI_PATH = path.join(__dirname, '../../rncanopy-cli');
const REGISTRY_PATH = path.join(__dirname, '..');

// Import the CLI template system to generate actual color files
async function generateTemplateColors() {
  console.log('🎨 Generating template colors from CLI...\n');
  
  const templateNames = ['canopy', 'dusk', 'sunbeam', 'slate'];
  
  for (const templateName of templateNames) {
    console.log(`Processing ${templateName}...`);
    
    try {
      // Import the template and token generator from CLI
      const { getTemplate } = require(path.join(CLI_PATH, 'dist/templates'));
      const { generateColorTokenFile } = require(path.join(CLI_PATH, 'dist/utils/token-generator'));
      
      // Get template and generate colors
      const template = getTemplate(templateName);
      const colorsContent = generateColorTokenFile(template);
      
      // Extract just the colors object from the generated file
      const colorsMatch = colorsContent.match(/export const colors = (\{[\s\S]*?\}) as const;/);
      
      if (colorsMatch) {
        // Convert the TypeScript object to JSON
        const colorsStr = colorsMatch[1];
        
        // Simple string replacements to make it valid JSON
        let jsonStr = colorsStr
          .replace(/(\w+):/g, '"$1":')  // Quote keys
          .replace(/'/g, '"')          // Single to double quotes
          .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
          .replace(/\[(\s*'[^']*'(?:\s*,\s*'[^']*')*\s*)\]/g, (match, content) => {
            return '[' + content.replace(/'/g, '"') + ']';
          });
        
        try {
          const colors = JSON.parse(jsonStr);
          
          // Write to registry
          const templateDir = path.join(REGISTRY_PATH, 'templates', templateName);
          fs.writeFileSync(
            path.join(templateDir, 'colors.json'),
            JSON.stringify(colors, null, 2)
          );
          
          console.log(`  ✅ Generated colors for ${template.displayName}`);
        } catch (parseError) {
          console.error(`  ❌ Failed to parse colors for ${templateName}:`, parseError.message);
        }
      }
      
    } catch (error) {
      console.error(`  ❌ Error processing ${templateName}:`, error.message);
    }
  }
  
  console.log('\n🎉 Template colors generated!');
}

if (require.main === module) {
  generateTemplateColors().catch(console.error);
}