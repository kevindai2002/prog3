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

// Part 3 additions
var normalBuffer; // buffer for vertex normals
var ambientBuffer; // buffer for ambient colors
var specularBuffer; // buffer for specular colors
var nBuffer; // buffer for shininess values


// ASSIGNMENT HELPER FUNCTIONS

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
        var coordArray = []; // 1D array of vertex coords for WebGL
        var colorArray = []; // 1D array of vertex colors for WebGL
        var normalArray = []; // 1D array of vertex normals for WebGL
        var ambientArray = []; // 1D array of ambient colors
        var specularArray = []; // 1D array of specular colors
        var nArray = []; // 1D array of shininess values

        // Loop through each triangle set
        for (var whichSet=0; whichSet<inputTriangles.length; whichSet++) {
            var currentSet = inputTriangles[whichSet];

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
                numTriangles++;
            }
        } // end for each triangle set

        // send the vertex coords to webGL
        vertexBuffer = gl.createBuffer(); // init empty vertex coord buffer
        gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer); // activate that buffer
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(coordArray),gl.STATIC_DRAW); // coords to that buffer

        // send the vertex colors to webGL
        colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(colorArray),gl.STATIC_DRAW);

        // send the vertex normals to webGL
        normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(normalArray),gl.STATIC_DRAW);

        // send the ambient colors to webGL
        ambientBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,ambientBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(ambientArray),gl.STATIC_DRAW);

        // send the specular colors to webGL
        specularBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,specularBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(specularArray),gl.STATIC_DRAW);

        // send the shininess values to webGL
        nBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,nBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(nArray),gl.STATIC_DRAW);

        console.log("Loaded " + numTriangles + " triangles");
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

    // Create view matrix: eye at (0.5, 0.5, -0.5), looking at (0.5, 0.5, 0)
    var viewMatrix = mat4.create();
    var lookAtPoint = vec3.fromValues(0.5, 0.5, 0.0);
    var upVector = vec3.fromValues(0.0, 1.0, 0.0);
    var eyePos = vec3.fromValues(0.5, 0.5, -0.5);
    mat4.lookAt(viewMatrix, eyePos, lookAtPoint, upVector);

    // Create projection matrix
    var projMatrix = mat4.create();
    mat4.perspective(projMatrix, Math.PI / 2, 1.0, 0.1, 10.0);

    // Model matrix (identity for now)
    var modelMatrix = mat4.create();

    // Combine into MVP
    var mvpMatrix = mat4.create();
    mat4.multiply(mvpMatrix, projMatrix, viewMatrix);
    mat4.multiply(mvpMatrix, mvpMatrix, modelMatrix);

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

    // Bind vertex buffer
    gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer);
    gl.vertexAttribPointer(vertexPositionAttrib,3,gl.FLOAT,false,0,0);

    // Bind color buffer
    gl.bindBuffer(gl.ARRAY_BUFFER,colorBuffer);
    gl.vertexAttribPointer(colorAttrib,3,gl.FLOAT,false,0,0);

    // Bind normal buffer
    gl.bindBuffer(gl.ARRAY_BUFFER,normalBuffer);
    gl.vertexAttribPointer(normalAttrib,3,gl.FLOAT,false,0,0);

    // Bind ambient buffer
    gl.bindBuffer(gl.ARRAY_BUFFER,ambientBuffer);
    gl.vertexAttribPointer(ambientAttrib,3,gl.FLOAT,false,0,0);

    // Bind specular buffer
    gl.bindBuffer(gl.ARRAY_BUFFER,specularBuffer);
    gl.vertexAttribPointer(specularAttrib,3,gl.FLOAT,false,0,0);

    // Bind shininess buffer
    gl.bindBuffer(gl.ARRAY_BUFFER,nBuffer);
    gl.vertexAttribPointer(nAttrib,1,gl.FLOAT,false,0,0);

    // Send uniforms to shader
    gl.uniformMatrix4fv(mvpUniform, false, mvpMatrix);
    gl.uniform3f(lightPosUniform, -0.5, 1.5, -0.5); // Light at (-0.5, 1.5, -0.5)
    gl.uniform3f(eyePosUniform, 0.5, 0.5, -0.5); // Eye at (0.5, 0.5, -0.5)

    // Draw all triangles
    gl.drawArrays(gl.TRIANGLES,0,numTriangles * 3);
} // end render triangles


/* MAIN -- HERE is where execution begins after window load */

function main() {
  
  setupWebGL(); // set up the webGL environment
  loadTriangles(); // load in the triangles from tri file
  setupShaders(); // setup the webGL shaders
  renderTriangles(); // draw the triangles using webGL
  
} // end main
