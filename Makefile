docs:
	rm -rf build/docs
	jsdoc -c .jsdoc.json

dev:
	npm i src/app
	npm i src/site

search:
	sudo docker run -it --env-file=.env -e "CONFIG=$$(cat .docsearch.json | jq -r tostring)" algolia/docsearch-scraper

clean:
	rm -r ./*/node_modules/

.PHONY: docs dev clean search
