import React, { useEffect, useRef } from 'react';
import { FiPhone, FiPhoneOff, FiMic, FiMicOff, FiVideo, FiVideoOff } from 'react-icons/fi';
import Jdenticon from 'react-jdenticon';

const CallModal = ({
    call,
    callAccepted,
    userVideoRef,
    stream,
    isReceivingCall,
    answerCall,
    leaveCall,
    isMicOn,
    isCamOn,
    toggleMic,
    toggleCam
}) => {
    const myVideoRef = useRef();

    useEffect(() => {
        if (stream && myVideoRef.current) {
            myVideoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div className="call-modal-overlay">
            <div className="call-modal-content">
                <div className="video-container">
                    <div className="video-wrapper my-video-wrapper">
                        {stream && <video playsInline muted ref={myVideoRef} autoPlay className="my-video" />}
                    </div>

                    {callAccepted && (
                        <div className="video-wrapper user-video-wrapper">
                            <video playsInline ref={userVideoRef} autoPlay className="user-video" />
                        </div>
                    )}
                </div>

                <div className="caller-info">
                    <Jdenticon size="60" value={call.name || 'User'} />
                    <h3>{call.name || 'Calling...'}</h3>
                </div>

                {isReceivingCall && !callAccepted && (
                    <div className="incoming-call-actions">
                        <h4>Incoming Call...</h4>
                        <button className="call-action-btn answer" onClick={answerCall}>
                            <FiPhone /> Answer
                        </button>
                    </div>
                )}

                <div className="call-controls">
                    <button className={`control-btn ${isMicOn ? '' : 'off'}`} onClick={toggleMic}>
                        {isMicOn ? <FiMic /> : <FiMicOff />}
                    </button>
                    <button className="control-btn hang-up" onClick={leaveCall}>
                        <FiPhoneOff />
                    </button>
                    <button className={`control-btn ${isCamOn ? '' : 'off'}`} onClick={toggleCam}>
                        {isCamOn ? <FiVideo /> : <FiVideoOff />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CallModal;