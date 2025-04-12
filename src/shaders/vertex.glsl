attribute vec4 a_Position;
attribute vec2 a_Video_Texture_Position;
attribute vec2 a_Alpha_Video_Texture_Position;
varying vec2 v_Video_Texture_Position;
varying vec2 v_Alpha_Video_Texture_Position;

void main () {
  gl_Position = a_Position;
  v_Video_Texture_Position = a_Video_Texture_Position;
  v_Alpha_Video_Texture_Position = a_Alpha_Video_Texture_Position;
}