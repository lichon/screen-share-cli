import './index.css'

const ICESERVER = {
  urls: [
    'stun:stun.cloudflare.com:3478',
    'stun:stun.nextcloud.com:443',
  ]
}

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
  const hasVideo = args.offer?.includes('a=video')
  const hasAudio = args.offer?.includes('a=audio')
  if (hasAudio || hasVideo) {
    close('offer-includes-media')
    return
  }
  const offerSdp = atob(args.offer || '')

  startMedia(args).then((stream) => {
    const pc = createPeerConnection(stream)
    log('created peer connection, got stream')
    if (offerSdp) {
      createAnswer(pc, offerSdp).then(() => {
        sendAnswer(pc.localDescription!.sdp!)
      })
    } else {
      createOffer(pc)
    }
  }).catch((e) => {
    close('failed-to-start-media')
  })
})

const startMedia = async (args: any): Promise<MediaStream> => {
  const mediaArgs = {
    audio: args.audio || true,
    video: {
      frameRate: args.fps || 30,
      width: args.width || undefined,
      height: args.height || undefined,
    }
  }

  const video = document.querySelector('video')
  return new Promise<MediaStream>((resolve, reject) => {
    if (args.camera) {
      navigator.mediaDevices.getUserMedia(mediaArgs).then(stream => {
        if (!args.hide) video.srcObject = stream
        resolve(stream)
      }).catch(e => {
        reject(e)
      })
    } else {
      navigator.mediaDevices.getDisplayMedia(mediaArgs).then(stream => {
        if (!args.hide) video.srcObject = stream
        resolve(stream)
      }).catch(e => {
        reject(e)
      })
    }
  })
}

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

const createPeerConnection = (mediaStream?: MediaStream) => {
  const pc = new RTCPeerConnection({ iceServers: [ICESERVER] })
  let mediaPc: RTCPeerConnection | null = null
  pc.onconnectionstatechange = () => {
    log('connection state', pc.connectionState)
    if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
      close('connection-state-' + pc.connectionState)
    }
  }
  pc.ondatachannel = (event) => {
    const channel = event.channel
    channel.onopen = () => {
      // wait for next request
    }
    channel.onmessage = (e) => {
      const offer = JSON.parse(e.data)
      if (offer.type !== 'offer') {
        log('unknown data channel message', e.data)
        return
      }
      mediaPc = new RTCPeerConnection({ iceServers: [ICESERVER] })
      mediaStream.getTracks().forEach(track => {
        mediaPc.addTrack(track, mediaStream)
      })
      createAnswer(mediaPc, offer.sdp).then(() => {
        channel.send(JSON.stringify(mediaPc.localDescription!.toJSON()))
      })
    }
    channel.onclose = () => {
      mediaPc.close()
      log('data channel closed')
    }
  }
  return pc
}

const createAnswer = async (pc: RTCPeerConnection, offerSdp: string): Promise<void> => {
  return pc.setRemoteDescription(new RTCSessionDescription({
    type: 'offer',
    sdp: offerSdp
  })).then(() => {
    return pc.createAnswer()
  }).then(answer => {
    return pc.setLocalDescription(answer)
  }).catch(e => {
    log('error creating answer', e)
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
  }, 1000)

  pc.createOffer().then(offer => {
    pc.setLocalDescription(offer)
  }).catch(e => {
    close('failed-to-create-offer')
  })
}
