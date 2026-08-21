import { describe, expect, it } from "vitest";
import { toWikimediaImage, type RawPage } from "./wikimedia-commons-client";

const photoPage: RawPage = {
  title: "File:Taj Mahal at sunset.jpg",
  imageinfo: [
    {
      url: "https://upload.wikimedia.org/wikipedia/commons/a/ab/Taj_Mahal_at_sunset.jpg",
      thumburl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Taj_Mahal_at_sunset.jpg/1200px-Taj_Mahal_at_sunset.jpg",
      thumbwidth: 1200,
      thumbheight: 800,
      descriptionurl: "https://commons.wikimedia.org/wiki/File:Taj_Mahal_at_sunset.jpg",
      mime: "image/jpeg",
      extmetadata: {
        Artist: { value: '<a href="//commons.wikimedia.org/wiki/User:Someone">A. Photographer</a>' },
        LicenseShortName: { value: "CC BY-SA 4.0" },
      },
    },
  ],
};

describe("toWikimediaImage", () => {
  it("maps a Commons search result into a WikimediaImage, stripping HTML from the attribution", () => {
    expect(toWikimediaImage(photoPage)).toEqual({
      title: "File:Taj Mahal at sunset.jpg",
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Taj_Mahal_at_sunset.jpg/1200px-Taj_Mahal_at_sunset.jpg",
      pageUrl: "https://commons.wikimedia.org/wiki/File:Taj_Mahal_at_sunset.jpg",
      width: 1200,
      height: 800,
      attribution: "A. Photographer",
      license: "CC BY-SA 4.0",
    });
  });

  it("keeps a photo without attribution metadata rather than dropping it", () => {
    const page: RawPage = {
      title: "File:Unattributed.jpg",
      imageinfo: [{ url: "https://upload.wikimedia.org/wikipedia/commons/x/Unattributed.jpg", mime: "image/jpeg" }],
    };
    expect(toWikimediaImage(page)).toEqual({
      title: "File:Unattributed.jpg",
      url: "https://upload.wikimedia.org/wikipedia/commons/x/Unattributed.jpg",
    });
  });

  it("rejects non-image files (audio, video, PDF)", () => {
    const page: RawPage = {
      title: "File:Anthem.ogg",
      imageinfo: [{ url: "https://upload.wikimedia.org/wikipedia/commons/x/Anthem.ogg", mime: "audio/ogg" }],
    };
    expect(toWikimediaImage(page)).toBeUndefined();
  });

  it("skips a page with no title or no resolvable URL", () => {
    expect(toWikimediaImage({ imageinfo: [{ url: "https://example.com/x.jpg" }] })).toBeUndefined();
    expect(toWikimediaImage({ title: "File:No image info.jpg" })).toBeUndefined();
  });
});
