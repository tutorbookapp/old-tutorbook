const subdomain = window.location.hostname.split('.').length > 2;
const pathnameParts = window.location.pathname
  .split('/')
  .filter((part) => part);
if (pathnameParts.shift() === 'app' || subdomain) {
  var newLocation = '/app/?redirect=' + pathnameParts.join('/');
  for (const [key, value] of new URLSearchParams(window.location.search))
    newLocation += '&' + key + '=' + window.encodeURIComponent(value);
  window.location.replace(newLocation);
}
