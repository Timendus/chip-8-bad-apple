# Bad Apple on XO-CHIP

This is an attempt to bring the well known Bad Apple music video to XO-CHIP,
music and all.

## Development log

### Getting started

How much can you really fit in XO-CHIP's ~64k of memory? When I'm hand-writing
code it seems like I never come near the limit. Even when I add lots of four
colour (or even sixteen colour) images, the resolution is so low that there's
generally plenty of space.

But would it be enough to store an entire music video? A quick
back-of-the-napkin calculation did not make me happy:

> An uncompressed image of 64 x 32 pixels (in "lores" mode) is 256 bytes. The
> entire Bad Apple video consists of 6562 frames at 30FPS. 6562 x 256 = 1679872
> bytes, or one megabyte of data. That's 26 times the memory we have available.
>
> Calculating from the other end: The whole video is 3 minutes and 39 seconds.
> That's a little under 300 bytes per second. Not per frame, per second!
>
> This means that to achieve 1 bit lores video at 30FPS we need a compression
> ratio of 97%. I couldn't pull off more than around 25% image compression last
> time for 3D VIP'r Maze...

And keep in mind that we also need some storage left for program code and music.

So that's going to be an insanely tight squeeze. This project is probably doomed
from the start 😄

To improve my odds a bit, I asked Kouzerumatsukite (who made the XO-tracker last
year) if he would be interested in joining me on this project for the music
part. I enjoy making music, but I'm no hero when it comes to trackers.

In a little over a week, the first teaser video came my way with the first parts
of the Bad Apple song, and it sounded amazing for the platform 🎉 This was a
hopeful sign that if I could get the video compressed well enough, maybe we
could pull off something cool here.

### Looking at the bright side

There are a couple of reasons why this may be doable, even though our
calculations say otherwise.

1. We don't need 30FPS to give the impression of fluid motion, a variable number
   of frames per second may be more appropriate;
2. Our compression doesn't need to be lossless, we can have a few messed up
   pixels in some frames;
3. The Bad Apple video is special in the sense that it has large swaths of the
   same colour for much of the time.

Because of the black-and-white and animated nature of the video, not the whole
screen changes every frame and much of the frame is a single colour. So this
data should lend itself much better to my run length encoding scheme than the
3D VIP's Maze images. Also, because each frame is shown for only a very short
amount of time, we could maybe implement a very simple lossy video codec.

So let's start by run length encoding each frame and see where we're at.

### So many pictures

After a couple of hours of messing with this project, I had my RLE encoder from
3D VIP'r Maze running on the Bad Apple frames, with a new custom decoder. The
old decoder was built for speed, sacrificing space in both the algorithm and the
compressed images. That choice was made to keep the game playable on the Cosmac
VIP, but we don't necessarily need to be fast here. For XO-CHIP we can just
crank up the cycles per frame.

The result looked like this:

![The first third of Bad Apple, without sound, running on XO-CHIP](./pictures/first-result.gif)

I quickly figured out that most frames compressed even better if I didn't store
the original frame, but rather the changes from the current frame to the
previous frame. By using XOR to find the changes, we can make use of one of the
strengths of CHIP-8: the only difference in the decoder between rendering a full
new frame and rendering the changes relative to the previous frame is wether the
decoder clears the screen before drawing.

To make sure that we always use the smallest version of the frame, the encoder
checks the lengths of the original (uncompressed) bitmap, the run length encoded
version of the original and the run length encoded version of the diff.

This, plus the unique nature of the video, as pointed out above, made this data
compress much better than the 3D VIP'r Maze image data. This data easily
compressed to an over 50% compression rate. Or in other words: it made the video
over twice as small.

But still, at this stage I could only store 1800 frames of the 6562 total, while
leaving us some space for the music. And that at a lower frame rate of 15 frames
per second.

Now there are roughly three directions we can take this in:
1. Reduce the frame rate even more, to around 5 frames per second; or
2. Reduce the image size to about a third of `lores`; or
3. Start looking into better ways to compress the video, specifically lossy
   video codecs.

Obviously there is only one correct answer 😄

But before we get into that, a couple of other things need fixing:
* We have some weird error in the first couple of frames
* The aspect ratio is wrong
* I don't like the quality of the resize; it loses too much detail

### On codecs
