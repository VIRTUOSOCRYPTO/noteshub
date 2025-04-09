{pkgs}: {
  deps = [
    pkgs.jq
    pkgs.imagemagick
    pkgs.ffmpeg
    pkgs.exiftool
    pkgs.clamav
    pkgs.lsof
    pkgs.unixtools.ping
    pkgs.postgresql
  ];
}
