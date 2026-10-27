// Parte de app.json. En el modo admin (EXPO_PUBLIC_APP_MODE=admin) cambia el nombre que ve el navegador.
module.exports = ({ config }) => {
  if (process.env.EXPO_PUBLIC_APP_MODE !== 'admin') return config;
  return { ...config, name: 'Salomón Admin' };
};
