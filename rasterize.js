/* GLOBAL CONSTANTS AND VARIABLES */

/* assignment specific globals */
const WIN_Z = 0;  // default graphics window z coord in world space
const WIN_LEFT = 0; const WIN_RIGHT = 1;  // default left and right x coords in world space
const WIN_BOTTOM = 0; const WIN_TOP = 1;  // default top and bottom y coords in world space
// const INPUT_TRIANGLES_URL = "https://ncsucgclass.github.io/prog3/triangles.json"; // triangles file loc
// const INPUT_ELLIPSOIDS_URL = "https://ncsucgclass.github.io/prog3/ellipsoids.json";
const INPUT_TRIANGLES_URL = "triangles2.json"; // local triangles file
const INPUT_ELLIPSOIDS_URL = "ellipsoids.json"; // local ellipsoids file
//const INPUT_SPHERES_URL = "https://ncsucgclass.github.io/prog3/spheres.json"; // spheres file loc
var Eye = new vec4.fromValues(0.5,0.5,-0.5,1.0); // default eye position in world space

/* webgl globals */
var gl = null; // the all powerful gl object. It's all here folks!
var vertexBuffer; // this contains vertex coordinates in triples
var triangleBuffer; // this contains indices into vertexBuffer in triples
var triBufferSize; // the number of indices in the triangle buffer
var altPosition; // flag indicating whether to alter vertex positions
var vertexPositionAttrib; // where to put position for vertex shader
var altPositionUniform; // where to put altPosition flag for vertex shader

// Part 2 additions
var inputTriangles = null; // the input triangles
var colorBuffer; // buffer for vertex colors
var numTriangles = 0; // total number of triangles to render
var shaderProgram; // shader program reference
var triangleSets = []; // array to store each triangle set's data separately

// Part 3 additions
var normalBuffer; // buffer for vertex normals
var ambientBuffer; // buffer for ambient colors
var specularBuffer; // buffer for specular colors
var nBuffer; // buffer for shininess values

// Part 4 additions - camera control
var cameraPosition = vec3.fromValues(0.5, 0.5, -0.5); // camera position
var lookAtPoint = vec3.fromValues(0.5, 0.5, 0.0); // look at point
var upVector = vec3.fromValues(0.0, 1.0, 0.0); // up vector
var viewDirection = vec3.create(); // view direction vector
var viewRight = vec3.create(); // right vector
var viewUp = vec3.create(); // up vector

// Part 5 additions - model selection
var selectedModel = -1; // index of selected model (-1 = none)
var modelTransforms = []; // array of transform matrices for each model


// ASSIGNMENT HELPER FUNCTIONS

// Initialize view vectors
function initViewVectors() {
    vec3.subtract(viewDirection, lookAtPoint, cameraPosition);
    vec3.normalize(viewDirection, viewDirection);
    vec3.cross(viewRight, viewDirection, upVector);
    vec3.normalize(viewRight, viewRight);
    vec3.cross(viewUp, viewRight, viewDirection);
    vec3.normalize(viewUp, viewUp);
}

// Handle keyboard input for camera control and model selection
function handleKeyPress(event) {
    var key = event.key;
    var translationAmount = 0.05; // translation step size
    var rotationAmount = 0.05; // rotation step size in radians

    // Part 5: Model selection
    if (key == 'ArrowLeft') {
        event.preventDefault();
        // Deselect current
        if (selectedModel >= 0) {
            mat4.identity(modelTransforms[selectedModel]);
        }
        // Select previous
        selectedModel--;
        if (selectedModel < 0) selectedModel = triangleSets.length - 1;
        // Apply highlight scale (1.2x)
        mat4.scale(modelTransforms[selectedModel], modelTransforms[selectedModel], [1.2, 1.2, 1.2]);
        renderTriangles();
        return;
    } else if (key == 'ArrowRight') {
        event.preventDefault();
        // Deselect current
        if (selectedModel >= 0) {
            mat4.identity(modelTransforms[selectedModel]);
        }
        // Select next
        selectedModel++;
        if (selectedModel >= triangleSets.length) selectedModel = 0;
        // Apply highlight scale (1.2x)
        mat4.scale(modelTransforms[selectedModel], modelTransforms[selectedModel], [1.2, 1.2, 1.2]);
        renderTriangles();
        return;
    } else if (key == ' ') {
        event.preventDefault();
        // Deselect current
        if (selectedModel >= 0) {
            mat4.identity(modelTransforms[selectedModel]);
            selectedModel = -1;
        }
        renderTriangles();
        return;
    }

    switch(key) {
        // Translation along view X (left/right)
        case 'a':
            vec3.scaleAndAdd(cameraPosition, cameraPosition, viewRight, -translationAmount);
            vec3.scaleAndAdd(lookAtPoint, lookAtPoint, viewRight, -translationAmount);
            break;
        case 'd':
            vec3.scaleAndAdd(cameraPosition, cameraPosition, viewRight, translationAmount);
            vec3.scaleAndAdd(lookAtPoint, lookAtPoint, viewRight, translationAmount);
            break;

        // Translation along view Z (forward/backward)
        case 'w':
            vec3.scaleAndAdd(cameraPosition, cameraPosition, viewDirection, translationAmount);
            vec3.scaleAndAdd(lookAtPoint, lookAtPoint, viewDirection, translationAmount);
            break;
        case 's':
            vec3.scaleAndAdd(cameraPosition, cameraPosition, viewDirection, -translationAmount);
            vec3.scaleAndAdd(lookAtPoint, lookAtPoint, viewDirection, -translationAmount);
            break;

        // Translation along view Y (up/down)
        case 'q':
            vec3.scaleAndAdd(cameraPosition, cameraPosition, viewUp, translationAmount);
            vec3.scaleAndAdd(lookAtPoint, lookAtPoint, viewUp, translationAmount);
            break;
        case 'e':
            vec3.scaleAndAdd(cameraPosition, cameraPosition, viewUp, -translationAmount);
            vec3.scaleAndAdd(lookAtPoint, lookAtPoint, viewUp, -translationAmount);
            break;

        // Rotation around view Y (yaw left/right)
        case 'A':
            var yawMatrix = mat4.create();
            mat4.rotate(yawMatrix, yawMatrix, rotationAmount, viewUp);
            vec3.transformMat4(viewDirection, viewDirection, yawMatrix);
            vec3.add(lookAtPoint, cameraPosition, viewDirection);
            vec3.cross(viewRight, viewDirection, upVector);
            vec3.normalize(viewRight, viewRight);
            break;
        case 'D':
            var yawMatrix = mat4.create();
            mat4.rotate(yawMatrix, yawMatrix, -rotationAmount, viewUp);
            vec3.transformMat4(viewDirection, viewDirection, yawMatrix);
            vec3.add(lookAtPoint, cameraPosition, viewDirection);
            vec3.cross(viewRight, viewDirection, upVector);
            vec3.normalize(viewRight, viewRight);
            break;

        // Rotation around view X (pitch up/down)
        case 'W':
            var pitchMatrix = mat4.create();
            mat4.rotate(pitchMatrix, pitchMatrix, rotationAmount, viewRight);
            vec3.transformMat4(viewDirection, viewDirection, pitchMatrix);
            vec3.add(lookAtPoint, cameraPosition, viewDirection);
            vec3.cross(viewUp, viewRight, viewDirection);
            vec3.normalize(viewUp, viewUp);
            break;
        case 'S':
            var pitchMatrix = mat4.create();
            mat4.rotate(pitchMatrix, pitchMatrix, -rotationAmount, viewRight);
            vec3.transformMat4(viewDirection, viewDirection, pitchMatrix);
            vec3.add(lookAtPoint, cameraPosition, viewDirection);
            vec3.cross(viewUp, viewRight, viewDirection);
            vec3.normalize(viewUp, viewUp);
            break;
    }

    renderTriangles(); // re-render after camera change
}

// get the JSON file from the passed URL
function getJSONFile(url,descr) {
    try {
        if ((typeof(url) !== "string") || (typeof(descr) !== "string"))
            throw "getJSONFile: parameter not a string";
        else {
            var httpReq = new XMLHttpRequest(); // a new http request
            httpReq.open("GET",url,false); // init the request
            httpReq.send(null); // send the request
            var startTime = Date.now();
            while ((httpReq.status !== 200) && (httpReq.readyState !== XMLHttpRequest.DONE)) {
                if ((Date.now()-startTime) > 3000)
                    break;
            } // until its loaded or we time out after three seconds
            if ((httpReq.status !== 200) || (httpReq.readyState !== XMLHttpRequest.DONE))
                throw "Unable to open "+descr+" file!";
            else
                return JSON.parse(httpReq.response); 
        } // end if good params
    } // end try    
    
    catch(e) {
        console.log(e);
        return(String.null);
    }
} // end get input spheres

// set up the webGL environment
function setupWebGL() {

    // Get the canvas and context
    var canvas = document.getElementById("myWebGLCanvas"); // create a js canvas
    gl = canvas.getContext("webgl"); // get a webgl object from it
    
    try {
      if (gl == null) {
        throw "unable to create gl context -- is your browser gl ready?";
      } else {
        gl.clearColor(0.0, 0.0, 0.0, 1.0); // use black when we clear the frame buffer
        gl.clearDepth(1.0); // use max when we clear the depth buffer
        gl.enable(gl.DEPTH_TEST); // use hidden surface removal (with zbuffering)
      }
    } // end try
    
    catch(e) {
      console.log(e);
    } // end catch
 
} // end setupWebGL

// read triangles in, load them into webgl buffers
function loadTriangles() {
    inputTriangles = getJSONFile(INPUT_TRIANGLES_URL,"triangles");
    if (inputTriangles != String.null) {

        // Loop through each triangle set and store separately
        for (var whichSet=0; whichSet<inputTriangles.length; whichSet++) {
            var currentSet = inputTriangles[whichSet];
            var coordArray = [];
            var colorArray = [];
            var normalArray = [];
            var ambientArray = [];
            var specularArray = [];
            var nArray = [];
            var numSetTriangles = 0;

            // For each triangle in this set
            for (var triIdx=0; triIdx<currentSet.triangles.length; triIdx++) {
                var triangle = currentSet.triangles[triIdx];

                // For each vertex in the triangle (3 vertices per triangle)
                for (var vertIdx=0; vertIdx<3; vertIdx++) {
                    var vtxIndex = triangle[vertIdx];
                    var vertex = currentSet.vertices[vtxIndex];
                    var normal = currentSet.normals[vtxIndex];

                    // Add vertex coordinates
                    coordArray.push(vertex[0], vertex[1], vertex[2]);

                    // Add diffuse color for this vertex
                    colorArray.push(currentSet.material.diffuse[0],
                                   currentSet.material.diffuse[1],
                                   currentSet.material.diffuse[2]);

                    // Add normal for this vertex
                    normalArray.push(normal[0], normal[1], normal[2]);

                    // Add ambient color
                    ambientArray.push(currentSet.material.ambient[0],
                                     currentSet.material.ambient[1],
                                     currentSet.material.ambient[2]);

                    // Add specular color
                    specularArray.push(currentSet.material.specular[0],
                                      currentSet.material.specular[1],
                                      currentSet.material.specular[2]);

                    // Add shininess
                    nArray.push(currentSet.material.n);
                }
                numSetTriangles++;
            }

            // Create buffers for this set
            var vBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(coordArray), gl.STATIC_DRAW);

            var cBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorArray), gl.STATIC_DRAW);

            var nmlBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, nmlBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalArray), gl.STATIC_DRAW);

            var ambBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, ambBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ambientArray), gl.STATIC_DRAW);

            var specBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, specBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(specularArray), gl.STATIC_DRAW);

            var nBuf = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, nBuf);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(nArray), gl.STATIC_DRAW);

            // Store this set's data
            triangleSets.push({
                vertexBuffer: vBuffer,
                colorBuffer: cBuffer,
                normalBuffer: nmlBuffer,
                ambientBuffer: ambBuffer,
                specularBuffer: specBuffer,
                nBuffer: nBuf,
                numTriangles: numSetTriangles
            });

            // Initialize transform matrix for this set (identity)
            modelTransforms.push(mat4.create());

            numTriangles += numSetTriangles;
        } // end for each triangle set

        console.log("Loaded " + inputTriangles.length + " triangle sets, " + numTriangles + " total triangles");
    } // end if triangles found
} // end load triangles

// setup the webGL shaders
function setupShaders() {

    // define vertex shader - applies MVP transform and passes data to fragment shader
    var vShaderCode = `
        attribute vec3 vertexPosition;
        attribute vec3 vertexNormal;
        attribute vec3 vertexColor;
        attribute vec3 vertexAmbient;
        attribute vec3 vertexSpecular;
        attribute float vertexN;

        uniform mat4 uMVP;

        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying vec3 vAmbient;
        varying vec3 vDiffuse;
        varying vec3 vSpecular;
        varying float vN;

        void main(void) {
            gl_Position = uMVP * vec4(vertexPosition, 1.0);
            vWorldPos = vertexPosition;
            vNormal = vertexNormal;
            vAmbient = vertexAmbient;
            vDiffuse = vertexColor;
            vSpecular = vertexSpecular;
            vN = vertexN;
        }
    `;

    // define fragment shader - implements Blinn-Phong lighting
    var fShaderCode = `
        precision mediump float;

        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying vec3 vAmbient;
        varying vec3 vDiffuse;
        varying vec3 vSpecular;
        varying float vN;

        uniform vec3 uLightPos;
        uniform vec3 uEyePos;

        void main(void) {
            // Normalize interpolated normal
            vec3 N = normalize(vNormal);

            // Light direction
            vec3 L = normalize(uLightPos - vWorldPos);

            // View direction
            vec3 V = normalize(uEyePos - vWorldPos);

            // Halfway vector for Blinn-Phong
            vec3 H = normalize(L + V);

            // Ambient component
            vec3 ambient = vAmbient;

            // Diffuse component
            float NdotL = max(dot(N, L), 0.0);
            vec3 diffuse = vDiffuse * NdotL;

            // Specular component (Blinn-Phong)
            float NdotH = max(dot(N, H), 0.0);
            vec3 specular = vSpecular * pow(NdotH, vN);

            // Combine all components
            vec3 color = ambient + diffuse + specular;

            gl_FragColor = vec4(color, 1.0);
        }
    `;

    try {
        var fShader = gl.createShader(gl.FRAGMENT_SHADER); // create frag shader
        gl.shaderSource(fShader,fShaderCode); // attach code to shader
        gl.compileShader(fShader); // compile the code for gpu execution

        var vShader = gl.createShader(gl.VERTEX_SHADER); // create vertex shader
        gl.shaderSource(vShader,vShaderCode); // attach code to shader
        gl.compileShader(vShader); // compile the code for gpu execution

        if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) { // bad frag shader compile
            throw "error during fragment shader compile: " + gl.getShaderInfoLog(fShader);
            gl.deleteShader(fShader);
        } else if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) { // bad vertex shader compile
            throw "error during vertex shader compile: " + gl.getShaderInfoLog(vShader);
            gl.deleteShader(vShader);
        } else { // no compile errors
            shaderProgram = gl.createProgram(); // create the single shader program
            gl.attachShader(shaderProgram, fShader); // put frag shader in program
            gl.attachShader(shaderProgram, vShader); // put vertex shader in program
            gl.linkProgram(shaderProgram); // link program into gl context

            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) { // bad program link
                throw "error during shader program linking: " + gl.getProgramInfoLog(shaderProgram);
            } else { // no shader program link errors
                gl.useProgram(shaderProgram); // activate shader program (frag and vert)
                vertexPositionAttrib = gl.getAttribLocation(shaderProgram, "vertexPosition");
                gl.enableVertexAttribArray(vertexPositionAttrib); // input to shader from array
            } // end if no shader program link errors
        } // end if no compile errors
    } // end try

    catch(e) {
        console.log(e);
    } // end catch
} // end setup shaders
// render the loaded model
function renderTriangles() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers

    // Create view matrix using dynamic camera vectors
    var viewMatrix = mat4.create();
    mat4.lookAt(viewMatrix, cameraPosition, lookAtPoint, viewUp);

    // Create projection matrix
    var projMatrix = mat4.create();
    mat4.perspective(projMatrix, Math.PI / 2, 1.0, 0.1, 10.0);

    // Get shader locations
    var mvpUniform = gl.getUniformLocation(shaderProgram, "uMVP");
    var lightPosUniform = gl.getUniformLocation(shaderProgram, "uLightPos");
    var eyePosUniform = gl.getUniformLocation(shaderProgram, "uEyePos");

    var colorAttrib = gl.getAttribLocation(shaderProgram, "vertexColor");
    var normalAttrib = gl.getAttribLocation(shaderProgram, "vertexNormal");
    var ambientAttrib = gl.getAttribLocation(shaderProgram, "vertexAmbient");
    var specularAttrib = gl.getAttribLocation(shaderProgram, "vertexSpecular");
    var nAttrib = gl.getAttribLocation(shaderProgram, "vertexN");

    // Enable vertex attributes
    gl.enableVertexAttribArray(vertexPositionAttrib);
    gl.enableVertexAttribArray(colorAttrib);
    gl.enableVertexAttribArray(normalAttrib);
    gl.enableVertexAttribArray(ambientAttrib);
    gl.enableVertexAttribArray(specularAttrib);
    gl.enableVertexAttribArray(nAttrib);

    // Set light and eye uniforms (same for all sets)
    gl.uniform3f(lightPosUniform, -0.5, 1.5, -0.5); // Light at (-0.5, 1.5, -0.5)
    gl.uniform3fv(eyePosUniform, cameraPosition); // Dynamic eye position

    // Render each triangle set with its own transform
    for (var setIdx = 0; setIdx < triangleSets.length; setIdx++) {
        var triSet = triangleSets[setIdx];

        // Get model matrix for this set
        var modelMatrix = modelTransforms[setIdx];

        // Combine into MVP
        var mvpMatrix = mat4.create();
        mat4.multiply(mvpMatrix, projMatrix, viewMatrix);
        mat4.multiply(mvpMatrix, mvpMatrix, modelMatrix);

        // Send MVP to shader
        gl.uniformMatrix4fv(mvpUniform, false, mvpMatrix);

        // Bind vertex buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, triSet.vertexBuffer);
        gl.vertexAttribPointer(vertexPositionAttrib, 3, gl.FLOAT, false, 0, 0);

        // Bind color buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, triSet.colorBuffer);
        gl.vertexAttribPointer(colorAttrib, 3, gl.FLOAT, false, 0, 0);

        // Bind normal buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, triSet.normalBuffer);
        gl.vertexAttribPointer(normalAttrib, 3, gl.FLOAT, false, 0, 0);

        // Bind ambient buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, triSet.ambientBuffer);
        gl.vertexAttribPointer(ambientAttrib, 3, gl.FLOAT, false, 0, 0);

        // Bind specular buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, triSet.specularBuffer);
        gl.vertexAttribPointer(specularAttrib, 3, gl.FLOAT, false, 0, 0);

        // Bind shininess buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, triSet.nBuffer);
        gl.vertexAttribPointer(nAttrib, 1, gl.FLOAT, false, 0, 0);

        // Draw this triangle set
        gl.drawArrays(gl.TRIANGLES, 0, triSet.numTriangles * 3);
    }
} // end render triangles


/* MAIN -- HERE is where execution begins after window load */

function main() {

  setupWebGL(); // set up the webGL environment
  loadTriangles(); // load in the triangles from tri file
  setupShaders(); // setup the webGL shaders
  initViewVectors(); // initialize camera view vectors
  renderTriangles(); // draw the triangles using webGL

  // Add keyboard event listeners for camera control and model selection
  document.addEventListener('keypress', handleKeyPress);
  document.addEventListener('keydown', handleKeyPress); // for arrow keys

} // end main
