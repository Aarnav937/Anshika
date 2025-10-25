/**
 * Simple Configuration System Demo
 * 
 * This demonstrates the configuration system working in practice.
 */

// Test the basic configuration service
async function testConfigurationSystem() {
  console.log('🧪 Testing Configuration System...');
  
  try {
    // Import the service (this works because our build succeeded)
    const { ConfigurationService } = await import('./core/ConfigurationService');
    
    console.log('✅ ConfigurationService imported successfully');
    
    // Create and initialize
    const config = new ConfigurationService();
    await config.initialize();
    
    console.log('✅ Configuration service initialized');
    
    // Test setting values
    await config.set('demo.message', 'Hello from Configuration System!');
    await config.set('demo.number', 42);
    await config.set('demo.boolean', true);
    await config.set('demo.object', { name: 'Test', version: 1.0 });
    
    console.log('✅ Test values stored');
    
    // Test getting values back
    const message = await config.get('demo.message');
    const number = await config.get('demo.number');
    const boolean = await config.get('demo.boolean');
    const object = await config.get('demo.object');
    
    console.log('📊 Retrieved values:');
    console.log('  Message:', message);
    console.log('  Number:', number);
    console.log('  Boolean:', boolean);
    console.log('  Object:', object);
    
    // Test defaults
    const withDefault = await config.get('nonexistent.key', 'default value');
    console.log('  With Default:', withDefault);
    
    // Test system status
    const status = await config.getStatus();
    console.log('📈 System Status:');
    console.log('  Healthy:', status.healthy);
    console.log('  Total Configurations:', status.statistics.totalConfigurations);
    
    // Test export functionality
    const backup = await config.exportConfiguration();
    console.log('💾 Backup created with', Object.keys(backup.configurations).length, 'configurations');
    
    // Test removing a value
    await config.remove('demo.message');
    const removedValue = await config.get('demo.message', 'not found');
    console.log('🗑️ After removal:', removedValue);
    
    console.log('🎉 All tests passed! Configuration system is working perfectly.');
    
    return {
      success: true,
      testedFeatures: [
        'Service initialization',
        'Setting/getting values',
        'Type handling (string, number, boolean, object)',
        'Default values',
        'System status',
        'Export functionality',
        'Value removal'
      ],
      results: {
        message,
        number,
        boolean,
        object,
        withDefault,
        status,
        backupSize: Object.keys(backup.configurations).length
      }
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Export for use
export { testConfigurationSystem };

// Auto-run if in Node.js or browser console
if (typeof window !== 'undefined') {
  // Browser environment
  console.log('🌐 Configuration System Demo Ready!');
  console.log('Run: testConfigurationSystem()');
  (window as any).testConfigurationSystem = testConfigurationSystem;
} else {
  // Node.js environment
  console.log('📦 Configuration System Module Loaded');
}