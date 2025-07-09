// Función de prueba para verificar el formateo de números
function testNumberFormatting() {
  const testNumbers = [
    '+52 1 55 4968 1111',
    '52 1 55 4968 1111',
    '+52 55 4968 1111',
    '52 55 4968 1111',
    '+52 1 55 4968 1111',
    '5215549681111',
    '52554968111'
  ];

  console.log('🧪 Testing number formatting:');
  console.log('================================');
  
  testNumbers.forEach((number, index) => {
    const cleaned = number.replace(/\D/g, '');
    const formatted = `${cleaned}@c.us`;
    
    console.log(`${index + 1}. Original: "${number}"`);
    console.log(`   Cleaned:  "${cleaned}" (${cleaned.length} digits)`);
    console.log(`   WhatsApp: "${formatted}"`);
    console.log('   ---');
  });
}

testNumberFormatting();
