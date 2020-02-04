const subdomain = window.location.hostname.split('.').length > 2;
const splitLocation = window.location.toString().split('/');
if (splitLocation.indexOf('app') >= 0 || subdomain) {
    var locationParameter = "/app/?redirect=";
    splitLocation.forEach((str) => {
        if (splitLocation.indexOf(str) > splitLocation.indexOf('app'))
            locationParameter += str + '/';
    });
    window.location.replace(locationParameter);
}