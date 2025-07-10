/*
 * This file is part of WPPConnect.
 *
 * WPPConnect is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * WPPConnect is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with WPPConnect.  If not, see <https://www.gnu.org/licenses/>.
 */

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
