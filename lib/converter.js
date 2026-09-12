import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

function toAudio(buffer, ext) {
    return brownish(buffer, [
        '-vn',
        '-ac', '2',
        '-b:a', '128k',
        '-ar', '44100',
        '-f', 'mp3',
    ], ext, 'mp3')
}

function brownish(buffer, args, ext, targetExt) {
    return new Promise((resolve, reject) => {
        let tmp = path.join(tmpdir(), + new Date + '.' + ext)
        let out = tmp + '.' + targetExt
        fs.writeFileSync(tmp, buffer)
        spawn('ffmpeg', [
            '-y',
            '-i', tmp,
            ...args,
            out
        ])
        .on('error', reject)
        .on('close', (code) => {
            try {
                fs.unlinkSync(tmp)
                if (code !== 0) return reject(code)
                resolve(fs.readFileSync(out))
                fs.unlinkSync(out)
            } catch (e) {
                reject(e)
            }
        })
    })
}
