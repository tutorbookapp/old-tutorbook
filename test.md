## Modules

<dl>
<dt><a href="#module_@tutorbook/app">@tutorbook/app</a></dt>
<dd><p>Package that contains the primary app class (<code>Tutorbook</code>) that depends on all 
of our other app packages and creates an instance of each one depending on 
the app user&#39;s and website&#39;s configuration.</p>
</dd>
</dl>

## Members

<dl>
<dt><a href="#app">app</a></dt>
<dd><p>The <code>window</code>&#39;s <a href="module:@tutorbook/app~Tutorbook">Tutorbook</a> web app 
instance. </p>
<p>You can access any variables or objects stored in that web app class from 
anywhere in your code (e.g. <code>window.app.render</code> points to a 
<a href="Render">Render</a> object).</p>
</dd>
</dl>

## Typedefs

<dl>
<dt><a href="#WebsiteConfig">WebsiteConfig</a> : <code>Object</code></dt>
<dd><p>A website configuration that denotes who can access the website, what
locations are shown on the website, what grades can be selected on the
website, etc.</p>
</dd>
</dl>

<a name="module_@tutorbook/app"></a>

## @tutorbook/app
Package that contains the primary app class (`Tutorbook`) that depends on all 
of our other app packages and creates an instance of each one depending on 
the app user's and website's configuration.

**See**: [https://npmjs.com/package/@tutorbook/app](https://npmjs.com/package/@tutorbook/app)  
**License**: Copyright (C) 2020 Tutorbook

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU Affero General Public License as published by the Free
Software Foundation, either version 3 of the License, or (at your option) any
later version.

This program is distributed in the hope that it will be useful, but WITHOUT
ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS 
FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more 
details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see [https://www.gnu.org/licenses/](https://www.gnu.org/licenses/).  

* [@tutorbook/app](#module_@tutorbook/app)
    * [module.exports](#exp_module_@tutorbook/app--module.exports) ⏏
        * [new module.exports()](#new_module_@tutorbook/app--module.exports_new)
        * _instance_
            * [.initFirebase()](#module_@tutorbook/app--module.exports+initFirebase)
            * [.startLogin()](#module_@tutorbook/app--module.exports+startLogin) ⇒ <code>Promise</code>
            * [.startApp()](#module_@tutorbook/app--module.exports+startApp)
            * [.initURLParams()](#module_@tutorbook/app--module.exports+initURLParams) ⇒ <code>Promise</code>
            * ~~[.preInit()](#module_@tutorbook/app--module.exports+preInit)~~
            * [.initWebsiteConfig()](#module_@tutorbook/app--module.exports+initWebsiteConfig) ⇒ <code>Promise</code>
            * [.view(header, main, [url])](#module_@tutorbook/app--module.exports+view)
            * [.initUser()](#module_@tutorbook/app--module.exports+initUser) ⇒ <code>Promise</code>
            * [.checkConfigCompliance(user, [profile])](#module_@tutorbook/app--module.exports+checkConfigCompliance) ⇒ <code>Promise</code>
            * [.updateUser()](#module_@tutorbook/app--module.exports+updateUser)
            * [.signOut()](#module_@tutorbook/app--module.exports+signOut)
            * [.loader([show])](#module_@tutorbook/app--module.exports+loader)
            * [.logJobPost()](#module_@tutorbook/app--module.exports+logJobPost)
            * [.print()](#module_@tutorbook/app--module.exports+print)
            * [.initOnMobile()](#module_@tutorbook/app--module.exports+initOnMobile)
        * _inner_
            * [~FirebaseUser](#external_FirebaseUser)

<a name="exp_module_@tutorbook/app--module.exports"></a>

### module.exports ⏏
Class that represents the uppermost level of our web app and holds all the 
other main app views (i.e. those accessible from the modal navigation 
drawer) as properties (e.g. `window.app.chats` points to the user's messages 
view).

**Kind**: Exported class  
<a name="new_module_@tutorbook/app--module.exports_new"></a>

#### new module.exports()
Creates a new Tutorbook object:
1. Initializes the website's configuration data (**without** grabbing
any location data).
2. Signs in (or uses existing authentication cookies if the user has 
already signed in) the user with [Firebase Authentication](https://firebase.google.com/docs/auth/web/start).
3. Initializes the rest of the app's local data (e.g. locations), all app 
views and packages, and routes the user to their desired destination 
(based on their URL) within the app.

**Example**  
```js
window.app = new Tutorbook(); // Creates a new global web app instance.
```
<a name="module_@tutorbook/app--module.exports+initFirebase"></a>

#### module.exports.initFirebase()
Initializes Firebase using the Firebase web app configuration.

**Kind**: instance method of [<code>module.exports</code>](#exp_module_@tutorbook/app--module.exports)  
**See**: [https://firebase.google.com/docs/web/setup#config-object](https://firebase.google.com/docs/web/setup#config-object)  
<a name="module_@tutorbook/app--module.exports+startLogin"></a>

#### module.exports.startLogin() ⇒ <code>Promise</code>
Views the login screen after the website configuration has been fetched 
and successfully initialized.

**Kind**: instance method of [<code>module.exports</code>](#exp_module_@tutorbook/app--module.exports)  
**Returns**: <code>Promise</code> - Promise that resolves after the website configuration
has been initialized and the user is viewing the login screen.  
<a name="module_@tutorbook/app--module.exports+startApp"></a>

#### module.exports.startApp()
Creates and initializes the rest of the app views and packages (starts 
the navigation router that routes the user to the desired destination 
with the app based on their URL).

**Kind**: instance method of [<code>module.exports</code>](#exp_module_@tutorbook/app--module.exports)  
<a name="module_@tutorbook/app--module.exports+initURLParams"></a>

#### module.exports.initURLParams() ⇒ <code>Promise</code>
Initializes app variables based on URL parameters.

**Kind**: instance method of [<code>module.exports</code>](#exp_module_@tutorbook/app--module.exports)  
**Returns**: <code>Promise</code> - Promise that resolves once the data has been synced 
with the app and the current user's Firestore profile document.  
**Todo**

- [ ] Debug security issues b/c anyone can fake any URL parameters.

<a name="module_@tutorbook/app--module.exports+preInit"></a>

#### ~~module.exports.preInit()~~
***Deprecated***

Initializes Tutorbook's website configuration and location data before
initializing the rest of the helper packages and logging the user in.

**Kind**: instance method of [<code>module.exports</code>](#exp_module_@tutorbook/app--module.exports)  
<a name="module_@tutorbook/app--module.exports+initWebsiteConfig"></a>

#### module.exports.initWebsiteConfig() ⇒ <code>Promise</code>
Fetches this website's configuration data and initializes it's location 
data.

**Kind**: instance method of [<code>module.exports</code>](#exp_module_@tutorbook/app--module.exports)  
**Returns**: <code>Promise</code> - Promise that resolves once the configuration data has
been fetched and initialized successfully (i.e. is accessible at 
`window.app.config`).  
**Todo**

- [ ] Why are we using [Data.listen](Data.listen) here?

<a name="module_@tutorbook/app--module.exports+view"></a>

#### module.exports.view(header, main, [url])
Replaces the currently viewed header, main, and URL and notifies the web 
app's navigation and ads.

**Kind**: instance method of [<code>module.exports</code>](#exp_module_@tutorbook/app--module.exports)  

| Param | Type | Description |
| --- | --- | --- |
| header | <code>HTMLElement</code> | The header element (typically an mdc-top- app-bar). |
| main | <code>HTMLElement</code> | The main element (typically an mdc-list or  mdc-layout-grid) |
| [url] | <code>string</code> | The view's URL. |

**Example**  
```js
window.app.view(this.header, this.main, '/app/messages');
window.app.view(this.header, this.main); // For dialogs w/out app URLs.
```
<a name="module_@tutorbook/app--module.exports+initUser"></a>

#### module.exports.initUser() ⇒ <code>Promise</code>
Initializes the app's user by:
1. Fetching the current user's (denoted by Firebase Auth) Firestore data.
2. Checking if the user fits within the current website configuration.
3. Creating a new Firestore document if one doesn't already exist.
4. Setting `window.app.user` equal to the whole profile, 
`window.app.conciseUser` equal to the 
[filtered]{@linkplain Utils.filterRequestUserData} profile, and 
`window.app.userClaims` equal to the user's custom authentication claims.

**Kind**: instance method of [<code>module.exports</code>](#exp_module_@tutorbook/app--module.exports)  
**Returns**: <code>Promise</code> - Promise that resolves once the app's user has 
successfully been initialized (and is ready to be used at 
`window.app.user`).  
**See**: [module:@tutorbook/app~Tutorbook#checkConfigCompliance](module:@tutorbook/app~Tutorbook#checkConfigCompliance)  
**Todo**

- [ ] The analytics logging here is inaccurate as the profile document is
updated without the user logging in or signing up.

<a name="module_@tutorbook/app--module.exports+checkConfigCompliance"></a>

#### module.exports.checkConfigCompliance(user, [profile]) ⇒ <code>Promise</code>
Checks if the given `user` (the `firebase.auth().currentUser`) and the 
user's `profile` (their Firestore document data) fits within the 
website's configuration.

**Kind**: instance method of [<code>module.exports</code>](#exp_module_@tutorbook/app--module.exports)  
**Returns**: <code>Promise</code> - Promise that resolves when we should continue with
the app's initialization (e.g. when we know the user fits within the
website configuration or wants to continue anyways in the case of the 
root website configuration).  

| Param | Type | Description |
| --- | --- | --- |
| user | [<code>FirebaseUser</code>](#external_FirebaseUser) | The `firebase.auth().currentUser`  to check compliance for. |
| [profile] | <code>Profile</code> | The `user`'s Firestore document data. |

<a name="module_@tutorbook/app--module.exports+updateUser"></a>

#### module.exports.updateUser()
Proxy function to Data's [updateUser](Data.updateUser) method.

**Kind**: instance method of [<code>module.exports</code>](#exp_module_@tutorbook/app--module.exports)  
**See**: [Data.updateUser](Data.updateUser)  
**Example**  
```js
await window.app.updateUser(); // Updates the current user's data.
await window.app.updateUser({ // Updates a subset of a specified user's
// data.
  uid: 'INSERT-THE-DESIRED-USER\'S-UID-HERE', // Make sure to always
  // include a valid user ID to update.
  grade: 'Junior', // Add data/fields you want to update here.
  gender: 'Male',
  subjects: ['Chemistry H'],
});
```
<a name="module_@tutorbook/app--module.exports+signOut"></a>

#### module.exports.signOut()
Unsubscribes to Firestore onSnapshot listeners, logs out of Intercom 
Messenger widget, and logs the current user out with Firebase Auth.

**Kind**: instance method of [<code>module.exports</code>](#exp_module_@tutorbook/app--module.exports)  
**See**

- [Help#logout](Help#logout)
- [https://firebase.google.com/docs/firestore/query-data/listen#detach_a_listener](https://firebase.google.com/docs/firestore/query-data/listen#detach_a_listener)

**Example**  
```js
window.app.signOut(); // Logs the user out and unsubscribes from 
// Firestore `onSnapshot` listeners.
```
<a name="module_@tutorbook/app--module.exports+loader"></a>

#### module.exports.loader([show])
Shows and hides the default intermediate loading icon.

**Kind**: instance method of [<code>module.exports</code>](#exp_module_@tutorbook/app--module.exports)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [show] | <code>bool</code> | <code>false</code> | Whether to show or hide the loading icon. |

**Example**  
```js
window.app.loader(false); // Hides the loading icon.
```
<a name="module_@tutorbook/app--module.exports+logJobPost"></a>

#### module.exports.logJobPost()
Logs a nice welcome message (with contact information for those 
interested in contributing) to curious developers taking a peak at our 
logs or website via their browser's developer tools.

**Kind**: instance method of [<code>module.exports</code>](#exp_module_@tutorbook/app--module.exports)  
**See**: [http://megacooltext.com/generator/big-letters/](http://megacooltext.com/generator/big-letters/)  
<a name="module_@tutorbook/app--module.exports+print"></a>

#### module.exports.print()
Prints the current view (minus any FAB buttons and the header).

**Kind**: instance method of [<code>module.exports</code>](#exp_module_@tutorbook/app--module.exports)  
**Example**  
```js
window.app.print(); // Hides the top app bar temporarily as it prints.
```
<a name="module_@tutorbook/app--module.exports+initOnMobile"></a>

#### module.exports.initOnMobile()
Checks if the user is currently viewing the app on a mobile device
(with regex on the user agent and by checking the current window
viewport size).

**Kind**: instance method of [<code>module.exports</code>](#exp_module_@tutorbook/app--module.exports)  
**See**: [https://stackoverflow.com/questions/11381673/detecting-a-mobile-browser](https://stackoverflow.com/questions/11381673/detecting-a-mobile-browser)  
<a name="external_FirebaseUser"></a>

#### module.exports~FirebaseUser
A Firebase `User` represents a user account and contains useful meta-data
about that user (e.g. their `displayName`, `email`, `phoneNumber`, and
`photoURL`).

**Kind**: inner external of [<code>module.exports</code>](#exp_module_@tutorbook/app--module.exports)  
**See**: [https://firebase.google.com/docs/reference/js/firebase.User](https://firebase.google.com/docs/reference/js/firebase.User)  
<a name="app"></a>

## app
The `window`'s [Tutorbook](module:@tutorbook/app~Tutorbook) web app 
instance. 

You can access any variables or objects stored in that web app class from 
anywhere in your code (e.g. `window.app.render` points to a 
[Render](Render) object).

**Kind**: global variable  
**See**: [module:@tutorbook/app~Tutorbook](module:@tutorbook/app~Tutorbook)  
**Example**  
```js
const headerEl = window.app.render.header('header-main'); // Points to an
// already initialized `Render` object used to render app elements.
```
**Example**  
```js
window.app.id; // Points to the hard-coded website configuration ID.
```
**Example**  
```js
for (location of window.app.locations) {
  // Do something with each of the locations stored in `window.app`.
  console.log(location.name + ' (' + location.id + ')');
}
```
**Example**  
```js
const timeSelect = window.app.render.select('Time', '', window.app.data
  .timeStrings); // Has an already initialized `Data` object too.
```
<a name="WebsiteConfig"></a>

## WebsiteConfig : <code>Object</code>
A website configuration that denotes who can access the website, what
locations are shown on the website, what grades can be selected on the
website, etc.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| created | <code>external:Timestamp</code> | When the website was created. |
| updated | <code>external:Timestamp</code> | The last time the website was  updated. |
| domains | <code>Array.&lt;string&gt;</code> | The email domains that can access this  website (i.e. a user be logged in with an email that ends in one of these  domains to be able to access this website configuration's app partition). |
| grades | <code>Array.&lt;string&gt;</code> | The grades that are shown (and thus can be  selected) on this website (e.g. `['Freshman', 'Sophomore']`). |
| locations | <code>Array.&lt;string&gt;</code> | The IDs of the locations shown on this  website. |
| url | <code>string</code> | The URL of the website's app partition (e.g. `'https://gunn.tutorbook.app'` or `'https://woodside.tutorbook.app'`). |
| name | <code>string</code> | The name of the website configuration (used  when showing the user error messages about invalid login attempts). |

