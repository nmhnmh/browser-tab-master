# Remove old files
rm -f icon_*.png

# Define target sizes
sizes="14 16 19 32 48 64 128 192 256 512 1024"

for size in $sizes
do
	name="icon_$size.png"
	echo "$name"
	convert browser-tab-master.png -strip -resize "$size" "$name"
done
