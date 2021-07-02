'use strict'

plugin.info = {
  name: "Linkedin Connect",
  chat,
  sayOnStart: task => pickOne(startChats(task)),
  sayOnEnd: task => pickOne(doneChats(task)),
}

function chat(task, status) {
  if(status.code == 102) return pickOne(startChats(task))
  if(status.code == 200) return pickOne(doneChats(task))
}

function startChats(task) {
  const user = getUser(task)
  return [
    `Going to send the connection request to profile for ${user}`,
    `Sending the connection request to profile for ${user}`,
  ]
}
const MAX_PENDING_CONNECTIONS=1000

function doneChats(task) {
  const user = getUser(task)
  return [
    `Finished sending the connection request to the profile ${user}`,
    `Done ${user} a connection request sent! Should be connected soon...`
  ]
}

function getUser(task) {
  if(!task.linkedInURL) return "(MISSING USER URL!)"
  let n = task.linkedInURL.split('/').filter(v => v)
  return n[n.length-1]
}

function pickOne(a) {
  return a[Math.floor(Math.random()*a.length)]
}

async function performTask(task) {

  await page.goto(task.linkedInURL)
  try {
    await page.waitForSelector('.distance-badge.separator')

    const connected = await page.evaluate(async () => {
      let d = document.getElementsByClassName("distance-badge separator")[0]
      let txt = d.innerText
      return txt.indexOf("1st degree connection") != -1
    })
    if(connected) {
      status.done()
      return
    }
  } catch(e) {
    /* ignore - we are not connected */
  }

  try {
    await page.goto("https://www.linkedin.com/mynetwork/invitation-manager/sent/")
    await page.waitForSelector('.mn-invitation-list')

    await autoScroll(page)
    const url = task.linkedInURL
    const already = await page.evaluate(async ({ url, MAX_PENDING_CONNECTIONS }) => {
      /**
       *  outcome/
       * This function removes the domain name from absolute_url and compare with relate_url.
       * if path's are matching return true else false
       *
       * @param {*} url1
       * @param {*} url2
       */
      function compareURLResourcePath(url1, url2){
        if (!url1 || !url2) return false

        if(isAbsoulteURL(url1))
          url1 = new URL(url1).pathname

        if(isAbsoulteURL(url2))
          url2 = new URL(url2).pathname

        if(!url1.endsWith('/')) url1 += '/'
        if(!url2.endsWith('/')) url2 += '/'
        if(!url1.startsWith('/')) url1 = '/' + url1
        if(!url2.startsWith('/')) url2 = '/' + url2

        return url1 == url2;
      }

      function isAbsoulteURL(url) {
        try{
          new URL(url)
          return true
        }catch(e) {
          return false;
        }

      }
      const invites = document.getElementsByClassName("mn-invitation-list")[0]
      const urls = invites.getElementsByTagName('a')
      for(let i = 0;i < urls.length;i++) {
        const isConnectPending = compareURLResourcePath(url, urls[i].href)
        if(isConnectPending) {
          return 'inprogress'
        }
      }

      const filterbar = document.getElementsByClassName('mn-filters-toolbar')[0]
      const nums = filterbar.innerText
      const m = nums.match(/People \((.*?)\)/)
      if(m) {
        const num = parseInt(m[1])
        if(!isNaN(num)) {
          if(num > MAX_PENDING_CONNECTIONS) return 'toomany'
        }
      }

    }, { url, MAX_PENDING_CONNECTIONS })
    if(already === "inprogress") {
      status.done()
      return
    }
    if(already) {
      status.usererr(already)
      return
    }
  } catch(e) {
    if(e.name != 'TimeoutError') throw e
    /* if no pending invitations - we can continue */
  }

  await page.goto(task.linkedInURL)
  let currentUrl = page.url()
  if(currentUrl.includes('unavailable')) throw new Error(`${task.linkedInURL}: this profile is not available`)
  await waitForConnectionOption(page,status)
  await waitForConnectedQuestion(page)

  if(task.message) {
    await waitForNoteOption(page,task.message)
    await waitforemailoption(page,task.email)
    await clickButton([
      'Done',
      'Send now',
      'Send invitation',
    ], page)
  } else {
    await waitforemailoption(page,task.email)
    await clickButton([
      'Done',
      'Send now',
      'Send invitation',
    ], page)
  }
  await page.goto("https://www.linkedin.com/mynetwork/invitation-manager/sent/")
  await page.waitForSelector('.mn-invitation-list')
  let first_url = await page.evaluate(()=>{
    const invites = document.getElementsByClassName("mn-invitation-list")[0]
    const urls = invites.getElementsByTagName('a')
    let firsturl = urls[0].href
    return firsturl
  })
  if(util.compareTwoStrings(first_url,task.linkedInURL)>0.9){
    status.done()
  }else{
      status.pageerr("Linkedin updated. Please notify developer.")
    }
}


// Handles different types of buttons occuring at the time of giving connection request.
function clickButton(names, page) {
  let promises = names.map(n => page.click(`button[aria-label="${n}"]`))
  return new Promise((resolve, reject) => {
    Promise.allSettled(promises).then(v => {
      for(let i = 0;i < v.length;i++) {
        if(v[i].status === 'fulfilled') return resolve()
      }
      return reject(v[0].reason)
    })
      .catch(reject)
  })
}

// For Handling Email prompts while sending connection request
async function waitforemailoption(page,email){
  try{
    const emailid = "input#email"
    await page.waitForSelector(emailid,{visible:true})
    if(email){
      await page.type(emailid,email)
    }
  }catch(e){
    return
  }
}

// For Handling Note prompts while sending connection request
async function waitForNoteOption(page,note){
  try{
    // replaced the extra space with single space
    note = note.replace(/\r\n/g, "\n");
    await page.waitForSelector('button[aria-label="Add a note"]', {visible: true})
    await page.click('button[aria-label="Add a note"]')
    await page.$('#custom-message')
      .then((connectionNote) => connectionNote.type(note))
  }catch(e){
    await page.$('#custom-message')
      .then((connectionNote) => connectionNote.type(note))
  }
}

async function waitForConnectionOption(page) {

  const selectors = [
    '.pvs-profile-actions__action.artdeco-button.artdeco-button--2.artdeco-button--primary.ember-view',
    '[data-control-name="connect"]',
    '.ml2.mr2.pv-s-profile-actions__overflow-toggle',
  ]
  const jsHandle = await page.waitForFunction((selectors) => {
      for (const selector of selectors) {
        if (document.querySelector(selector) !== null) {
          return selector;
        }
      }
      return false;
    }, {}, selectors);
   
  const selector = await jsHandle.jsonValue();
  console.log(selector)
  if (selector == selectors[0]){
    let textButton = await page.evaluate(()=>{
      let textele = document.querySelector(".pvs-profile-actions__action.artdeco-button.artdeco-button--2.artdeco-button--primary.ember-view")
      return textele.innerText
    })
    // Follow Button
    if(textButton == "Follow"){
      await page.waitForSelector(('[aria-label="More actions"]'))
      await page.click(('[aria-label="More actions"]'))
      await page.waitForSelector('[data-control-name="connect"]')
      await page.click('[data-control-name="connect"]')
      await page.waitForSelector('[aria-label="Connect"]')
      await page.click('[aria-label="Connect"]')
    }
    // Connect Button
    else if(textButton =="Connect"){
      await page.click(".pvs-profile-actions__action.artdeco-button.artdeco-button--2.artdeco-button--primary.ember-view")
      }
    }
  else if (selector == selectors[1]) {
    let error = null;
    await page.hover('yourSelector').catch(e => error = e);
    if (!error) {
      // Connect Button Case
      await page.waitForSelector('[data-control-name="connect"]')
      await page.click('[data-control-name="connect"]')
   }else{
    // Message And More Button Case
    await page.click(".artdeco-dropdown__trigger.artdeco-dropdown__trigger--placement-bottom.ember-view.pvs-profile-actions__action")
    await page.waitForSelector("[data-control-name=connect]")
    await page.click("[data-control-name=connect]")
    await page.waitForSelector('[aria-label="Connect"]')
    await page.click('[aria-label="Connect"]')
   }
    
    }
  else if(selector == selectors[2]){
    // Three Dot Button Case
    await page.waitForSelector(".ml2.mr2.pv-s-profile-actions__overflow-toggle")
    await page.click('.ml2.mr2.pv-s-profile-actions__overflow-toggle')
    await page.waitForSelector(".display-flex.t-normal.pv-s-profile-actions__label")
    await page.evaluate(()=>{
        document.querySelectorAll(".display-flex.t-normal.pv-s-profile-actions__label")[3].click()
    })
    await page.waitForSelector('[aria-label="Connect"]')
    await page.click('[aria-label="Connect"]')   
    }
    else{
      status.pageerr = "Couldnt find Connect Buttton.Please Notify Developer"
    }    
  
  }

// Handling whether connected before question
async function waitForConnectedQuestion(page){
  try
  {
    await page.waitForSelector('button[aria-label="No"]')
    await page.click('button[aria-label="No"]')
    await page.waitForSelector('button[aria-label="Connect"]')
    await page.click('button[aria-label="Connect"]')
  } catch(error){
    // ignore If the question didnt come 
  } 
}