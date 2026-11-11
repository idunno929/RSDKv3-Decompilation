# Emscripten / browser build.
#
# The software renderer is used initially to avoid desktop OpenGL/GLEW.
# SDL2, Ogg, Vorbis and Theora are compiled for WebAssembly by this target.

add_executable(RetroEngine ${RETRO_FILES})

set(DEP_PATH web)
set(RETRO_SDL_VERSION 2)
set(RETRO_USE_HW_RENDER OFF)

set(COMPILE_OGG TRUE)
set(COMPILE_VORBIS TRUE)
set(COMPILE_THEORA TRUE)

set(OGG_FLAGS -O2 -fPIC -DHAVE_CONFIG_H)
set(VORBIS_FLAGS -O2 -fPIC -DHAVE_CONFIG_H)
set(THEORA_FLAGS -O2 -fPIC -DHAVE_CONFIG_H)

target_compile_options(RetroEngine PRIVATE -O2 -pthread -sUSE_SDL=2)
target_link_options(RetroEngine PRIVATE
    -pthread
    -sUSE_SDL=2
    -sALLOW_MEMORY_GROWTH=1
    -sFORCE_FILESYSTEM=1
    -sINVOKE_RUN=0
    -sEXPORTED_RUNTIME_METHODS=callMain
    -lidbfs.js
    -sPTHREAD_POOL_SIZE=2
    -sEXIT_RUNTIME=0
)

set_target_properties(RetroEngine PROPERTIES SUFFIX ".html")
