import { send } from 'vite'
import './index.css'

const log = (...args: any[]) => {
  // @ts-ignore
  window.api.log(...args)
}

const close = (reason: string = 'unknown') => {
  // @ts-ignore
  window.api.close(reason)
}

const sendOffer = (sdp: string) => {
  // @ts-ignore
  window.api.offer(sdp)
}

const sendAnswer = (sdp: string) => {
  // @ts-ignore
  window.api.answer(sdp)
}

// @ts-ignore
window.api.onStart((args) => {
  log('start with args', args)
  const closeBtn = document.getElementById('close-btn')
  closeBtn.addEventListener('click', () => {
    close('user-closed')
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
  video.onloadeddata = () => {
    if (args.showClose) closeBtn.style.display = 'block'
  }

  new Promise<MediaStream>((resolve, reject) => {
    if (args.camera) {
      navigator.mediaDevices.getUserMedia(mediaArgs).then(stream => {
        if (!args.hide) video.srcObject = stream
        resolve(stream)
      }).catch(e => {
        reject(e)
      })
    } else {
      navigator.mediaDevices.getDisplayMedia(mediaArgs).then(stream => {
        resolve(stream)
        if (!args.hide) video.srcObject = stream
      }).catch(e => {
        reject(e)
      })
    }
  }).then((mediaStream) => {
    const pc = createPeerConnection(mediaStream)
    if (args.offer) {
      createAnswer(pc, args.offer)
    } else {
      (window as unknown as { pc: any }).pc = pc
      createOffer(pc)
    }
  }).catch(e => {
    close('failed-to-get-media-stream')
  })
})

// @ts-ignore
window.api.onAnswer((sdp: string) => {
  // @ts-ignore
  window.pc.setRemoteDescription(new RTCSessionDescription({
    type: 'answer',
    sdp: sdp
  })).catch((e: Error) => {
    close('failed-to-set-remote-description')
  })
})

const createPeerConnection = (mediaStream: MediaStream) => {
  const pc = new RTCPeerConnection({
    iceServers: [{
      urls: [
        'stun:stun.cloudflare.com:3478',
        'stun:stun.nextcloud.com:443',
      ]
    }]
  })
  mediaStream.getTracks().forEach(track => {
    pc.addTrack(track, mediaStream)
  })
  pc.onconnectionstatechange = () => {
    log('connection state', pc.connectionState)
    if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
      close('connection-state-' + pc.connectionState)
    }
  }
  return pc
}

const createAnswer = (pc: RTCPeerConnection, offerSdp: string) => {
  pc.setRemoteDescription(new RTCSessionDescription({
    type: 'offer',
    sdp: offerSdp
  })).then(() => {
    return pc.createAnswer()
  }).then(answer => {
    sendAnswer(answer.sdp!)
    return pc.setLocalDescription(answer)
  }).catch(e => {
    close('failed-to-set-offer')
  })
}

const createOffer = (pc: RTCPeerConnection) => {
  // wait for candidate
  let sent = false
  pc.onicegatheringstatechange = () => {
    if (pc.iceGatheringState === 'complete') {
      if (sent) return
      sent = true
      sendOffer(pc.localDescription!.sdp!)
    }
  }
  setTimeout(() => {
    if (sent) return
    sent = true
    sendOffer(pc.localDescription!.sdp!)
  }, 5000)

  pc.createOffer().then(offer => {
    pc.setLocalDescription(offer)
  }).catch(e => {
    close('failed-to-create-offer')
  })
}
