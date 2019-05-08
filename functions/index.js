'use strict';

const path = require('path')
const os = require('os')
const fs = require('fs')
const functions = require('firebase-functions')
const admin = require('firebase-admin')
admin.initializeApp(functions.config().firebase);

const base_image_path = 'photos'
const upload_image_folder = path.join(base_image_path, 'upload');
const thumbnail_folder = path.join(base_image_path, 'thumbnail');
const raw_image_folder = path.join(base_image_path, 'raw');

// Call function as receiving a new image files
//
// 1. Copy file to detection folder
// 2. Create thumbnail image and copy to folder
// 3. Add image information to realtime database

exports.upload_origin_image = functions.storage.object().onFinalize(async (object, context) => {
    
    const object_path = object.name;
    if (!object_path.startsWith(upload_image_folder)) {
        return console.log("This doesn't uploaded images ");
    }

    console.log('File Bucket: ', object.bucket);
    console.log('File Path:', object.name);

    if (!object.contentType.startsWith('image/')) {
        console.log('This is not an image.');
        return null;
    }

    const uuidv1 = require('uuid/v1')

    const file_name = uuidv1();
    const file_path = path.join(raw_image_folder, file_name);
    const tmp_file_path = path.join(os.tmpdir(), file_name);

    const thumb_name = `s_${file_name}`;
    const thumb_path = path.join(thumbnail_folder, thumb_name); 
    const tmp_thumb_path = path.join(os.tmpdir(), thumb_name);

    const bucket = admin.storage().bucket();

    try {
        // Downlaod photo to temporarily path
        console.log(`download image to ${tmp_file_path} and convert to thumbnail using ImageMagick`);
        await bucket.file(object.name).download({
            destination: tmp_file_path,
        });

        // Generate thumbnail
        console.log(`Convert image to thumbnail in ${tmp_thumb_path}`);
        const spawn = require('child-process-promise').spawn

        await spawn('convert', [tmp_file_path, '-thumbnail', '200x200>', '-auto-orient', tmp_thumb_path])

        // Upload thumbnail
        console.log('Copy thumbnail file to cloud storage: ', thumb_path);
        const metadata = { contentType: object.contentType };
        await bucket.upload(tmp_thumb_path, {
            destination: thumb_path,
            metadata: metadata
        });

        console.log('Uplode image file to cloud storage: ', file_path);
        await bucket.upload(tmp_file_path, {
            destination: file_path,
            metadata: metadata
        });
        fs.unlinkSync(tmp_file_path);
        fs.unlinkSync(tmp_thumb_path);

        // Update information to database firebase
        console.log('Saving posts information to database');
        console.log("object metadata = ", object.metadata);
        const actions = {};
        actions['gv_label_detection'] = 1;
        const post_meta = {
            origin_name: path.basename(object.name),
            image_name: file_name,
            thumbnail_name: thumb_name,
            update_time: context.timestamp,
            actions: actions
        };
        return admin.database().ref('posts').push().set(post_meta);
    }
    catch (reason) {
        // Catch error
        console.log(reason);
    }

});

exports.gv_label_detection = functions.database.ref('/posts/{pushId}/actions/gv_label_detection').onCreate(async (snapshot, context) => {

    console.log('Use google vision api to label images')

    if (snapshot.val() !== 1) {
        console.log('snapshot.val() = ', snapshot.val())
        return console.log('Action is false, do not run "gv_label_detection"')
    }

    const vision = require('@google-cloud/vision')
    const post_id = context.params.pushId

    try {
        return admin.database().ref(`/posts/${post_id}/image_name`).once("value", (snap) => {
            // Get push image name
            if (!snap.exists()) {
                throw new Error(`Post id ${post_id} does not have 'image_name' data`);
            }
            const file_name = snap.val();
            const raw_path = 'gs://' + path.join(admin.storage().bucket().name, raw_image_folder, file_name);
            const vision_client = new vision.ImageAnnotatorClient();
            
            return vision_client.labelDetection(raw_path).then(results => {
                const labels = results[0].labelAnnotations;
                console.log('Labels:', labels);
                const labels_info = {};
                labels.forEach(label => {
                    labels_info[label.description] = label.score;
                });
                const image_info_ref = admin.database().ref('image_info').child(file_name).child('label_detections');
                const update_time = (new Date()).toISOString();
                return image_info_ref.set({
                    model: 'google-vision-label-detection-api',
                    labels: labels_info,
                    update_time: update_time
                }).catch(error => {
                    console.log(error);
                });
            });
        });
    }
    catch (error_1) {
        console.log(error_1);
    }
});
