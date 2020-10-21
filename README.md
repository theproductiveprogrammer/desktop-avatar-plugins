# Desktop Avatar Plugins

Plugins for the Salesbox Desktop Avatar

![icon](./plugin.png)

This repository contains the plugins that perform actions for the desktop avatar.

## The Problem

The Salesbox Desktop Avatar is a client desktop application which is installed in a user’s machine. Because it performs task on behalf of the user that involve working with websites and webpages that often change the logic needs to be updated quite often. However, it is hard to coordinate multiple installations continually being updated.

## The Solution - Plugins

To solve this issue the Desktop Avatar holds a lot of it’s web page logic in plugin files from this repository. When the client application starts, it downloads the latest versions and hence can benefit from the latest changes without the user needing to worry about downloading/updating their own install.

## Quickstart

A plugin must be named after the task action it handles. For example the task `LINKEDIN_VIEW` would be handled by `LINKEDIN_VIEW.js`.

Each plugin is javascript with access to the **user’s browser**, the **task information**, and the **console/trace** for logging. The plugin **MUST** respond with the status of the task - _done_, or failed for a particular reason (_timeout_, _usererr_, _servererr_, _capcha_,…).

This is a sample of a `SCREENSHOT_NEWS.js` plugin:

```js
'use strict'

/*    understand/
 * plugin.info is expected to contain information about
 * this plugin - it's name and a longer chatty description
 * shown to the user of what we are going to do
 */
plugin.info = {
  name: "Screenshot News",
  chat: tellUserWhatWeDo, /* can be function or string */
}

/*    way/
 * to keep the chats with the user interesting, we vary
 * the stuff we tell him
 */
function tellUserWhatWeDo(task) {
  let chats = [
    "I'm going to checkout the latest news",
    "Taking a screenshot of the latest news for you",
    "Let's see what's on the news now",
    "No news is good news - let me see what's the latest",
  ]
  return chats[Math.floor(Math.random()*chats.length)]
}


/*    understand/
 * if we are given a plugin task then we perform it
 * typically using the browser. Again this is a standard
 * check and the meat of the task is done in the
 * "performTask" function
 * Here we also do a last check - if there is some bug/crash
 * we report it as a server error.
 */
if(plugin.task) {
  performTask(plugin.task)
    .then(() => 1)
    .catch(status.servererr)
}

/*    understand/
 * This is the core function we use to perform our task.
 * We use the browser given to use to do the work and
 * mark the status.
 * It's also recommended to close the page before exiting
 * because the browser is going to be re-used and it
 * should not have too many open pages - clean up as you go.
 */
async function performTask(task) {
  try {

    let page = await browser.newPage()

    await page.setDefaultNavigationTimeout(plugin.timeout)

    trace("going to reuters.com")
    await page.goto("https://www.reuters.com/", {
      waitUntil: 'networkidle2'
    })
    trace("taking screenshot")
    await page.screenshot({path: 'news.png'})
    trace("closing page")

    await page.close()
    status.done()

  } catch(e) {
    status.servererr(e)
  }
}
```

### API Details

The plugin has access to:

* **browser** : the [Puppeteer](https://pptr.dev/) browser instance for the associated user - already logged in and configured (`headless` or not etc)
* **console** : the usual javascript console
* **trace()** : a function that generates trace logs for easier debugging. `trace()` only generates logs when the `DEBUG` environment variable is set otherwise it defaults to a no-op.
* **status** : one of the following is expected to be triggered before the plugin exits:
  * _done_ : successfully completed
  * _usererr_ : the task given has some problem
  * _timeout_ : we’ve timed-out
  * _servererr_ : some bug in our code - don’t bother to retry until something changes
  * _errcapcha_ : the user needs to enter a captcha - notify him
  * _baduser_ : the user has been kicked off for some reason - notify him

**NB**: The plugin is running in a “sandboxed” environment and does not have access to other NodeJS features or abilities. It only has access to core javascript and the above API.

----

