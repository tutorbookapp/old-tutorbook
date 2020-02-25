docs:
	jsdoc -c .jsdoc.json

dev:
	npm i src/app
	npm i src/site

clean:
	rm -r ./*/node_modules/

.PHONY: docs dev clean
