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
version of the original and the run length encoded version of the diff, and
outputs the smallest of the three.

Using diffs, plus the unique nature of the video, as pointed out above, made
this data compress much better than the 3D VIP'r Maze image data. This data
easily compressed to an over 50% compression rate. Or in other words: it made
the video less than half as small.

But still, at this stage I could only store the video up to frame 1800 of the
6562 total, while leaving us some space for the music. And that at a lower frame
rate of 15 frames per second (I thought, but it's even worse, see below 😉).

Now there were roughly three directions we could take this in:
1. Reduce the frame rate even more; or
2. Reduce the image size a lot more; or
3. Start looking into better ways to compress the video, specifically lossy
   video codecs.

Obviously there is only one correct answer 😄

### Cleanup already?!

But before we could get into that, a couple of other things needed fixing:

* I had some weird error in the first couple of frames
* The aspect ratio was wrong
* I didn't like the quality of the resize; it lost too much detail
* Scaling all the frames every time I wanted to change something was too slow

I fixed the last three issues in one go by using ImageMagick to pre-scale the
video frames, instead of doing that in my encoder script. This way we have more
fine-grained control over the type of scaling that is done and we can just read
in the smaller images pixel-by-pixel, which is much faster. I decided to go with
48x32 pixels, as that is relatively close to a 4:3 ratio, a multiple of eight
and can be centered on the screen. To keep the aspect ratio correct, I cropped
two pixels off the top and bottom of the image.

An added benefit of losing 16 horizontal pixels is that we're also storing less
data than before. So now we can cram images up to frame 2200 in roughly the same
space!

But on the downside, when hunting for my bug (the first issue) I discovered that
I made a little mistake in the code that allows an image to be shown for
multiple frames. I was really only playing (and encoding) 7,5FPS, not 15. That
explains why my calculations were a bit off and also why the video seemed a bit
choppy. Fixing that to be back at a steady 15FPS of course meant that we did one
step forward and two steps back.

It's not as big of a deal as it may seem though, since a higher FPS rate
actually compresses better. Because the difference between successive images is
actually smaller. You'd expect that we could only fit the video in until frame
1100 at the correct 15FPS now (since that's half of 2200), but I was getting
somewhere close to 1500. This made me curious to see if the same holds for
larger frames with more pixels (`hires`, anyone?!). Still, this was an
unfortunate step back.

Other than that, the actual bug turned out to just be an issue with the original
frame images that I was using. Somehow a duplicate of frame 88 ended up in the
file of frame 61. So be warned when downloading an archive from a random
stranger on the internet that it may not always be 100% perfect 😉 I duplicated
frame 62 into frame 61 and called it a day. I don't notice one double frame,
especially at half the frame rate.

The end result after all of this cleanup:

![The video in the correct aspect ratio, with the proper frame rate and no more weird frame 61](./pictures/after-cleanup.gif)

I also tried to tell ImageMagick to apply some dithering instead of just simply
thresholding the images to bring it back to two colours. For some individual
frames, this looks much better. But in motion it looked a bit messy, with
"frayed" edges, and it compressed worse. See for yourself:

![The video with Floyd-Steinberg dithering applied](./pictures/dithering.gif)

### On codecs
