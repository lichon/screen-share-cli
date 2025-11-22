import './index.css'

const log = (...args: any[]) => {
  // @ts-ignore
  window.api.log(...args)
}

const close = () => {
  // @ts-ignore
  window.api.close()
}

// @ts-ignore
window.api.onStart((args) => {
  log('start with args', args)
  const closeBtn = document.getElementById('close-btn')
  closeBtn.addEventListener('click', () => {
    close()
  })

  const mediaArgs = {
    audio: args.audio || false,
    video: {
      frameRate: args.fps || 30,
      width: args.width || undefined,
      height: args.height || undefined,
    }
  }

  const video = document.querySelector('video')
  video.onplaying = () => {
    log('video playing')
    if (args.showClose) closeBtn.style.display = 'block'
  }
  if (args.camera) {
    navigator.mediaDevices.getUserMedia(mediaArgs).then(stream => {
      if (!args.hide) video.srcObject = stream
    }).catch(e => {
      log('get user media error', e)
      close()
    })
  } else {
    navigator.mediaDevices.getDisplayMedia(mediaArgs).then(stream => {
      if (!args.hide) video.srcObject = stream
    }).catch(e => {
      log('get display media error', e)
      close()
    })
  }
})
