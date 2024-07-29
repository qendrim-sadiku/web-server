const bcrypt = require('bcrypt');

const testPassword = async () => {
  const plainPassword = 'testpassword';
  const hashedPassword = await bcrypt.hash(plainPassword, 10);
  console.log('Hashed Password:', hashedPassword);

  const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
  console.log('Do they match?', isMatch);
};

testPassword();
