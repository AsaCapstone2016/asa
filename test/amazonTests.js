'use strict';
let chai = require('chai');
chai.use(require('chai-things'));
let expect = chai.expect;
let amazon = require('../core/amazon');

describe('itemSearch', function() {
    let items, searchBinSets, error;
    before(function(done){
        amazon.itemSearch("shoes").then(res => {
            items = res.Items;
            searchBinSets = res.SearchBinSets;
            done();
        }, err => {
            error = err;
            done();
        });
    });

    it('Items should not be empty', function(done) {
        expect(items).to.have.length.above(0);
        done();
    });

    it('Items should all contain primeEligible', function(done) {
        expect(items).all.have.property('primeEligible').that.is.not.undefined;
        done();
    });

    it('Check detail properties for each item', function(done) {
        items.forEach(item => {
            if (item.HasVariations) {
                describe('item with variation', function() {
                    it('item with variation contain HasVariations', function(done) {
                        expect(item).to.have.property('HasVariations').that.is.not.undefined;
                        done();
                    });
                    it('item with variation should not contain cartCreated', function(done) {
                        expect(item).not.to.have.property('cartCreated');
                        done();
                    });
                    it('item with variation should not contain purchaseUrl', function(done) {
                        expect(item).not.to.have.property('purchaseUrl');
                        done();
                    });
                    it('item with variation should not contain price', function(done) {
                        expect(item).not.to.have.property('price');
                        done();
                    });
                });
            } else if (item.price) {
                describe('item with cart created successfully', function() {
                    it('item with cart created successfully contain cartCreated', function(done) {
                        expect(item).to.have.property('cartCreated').that.is.not.undefined;
                        done();
                    });
                    it('item with cart created successfully contain purchaseUrl', function(done) {
                        expect(item).to.have.property('purchaseUrl').that.is.not.undefined;
                        done();
                    });
                    it('item with cart created successfully contain price', function(done) {
                        expect(item).to.have.property('price').that.is.not.undefined;
                        done();
                    });
                    it('item with cart created successfully should not contain HasVariations', function(done) {
                        expect(item).not.to.have.property('HasVariations');
                        done();
                    })
                })
            } else {
                describe('item with cart created unsuccessfully', function() {
                    it('item with cart created unsuccessfully contain cartCreated', function(done) {
                        expect(item).to.have.property('cartCreated').that.is.not.undefined;
                        done();
                    });
                    it('item with cart created unsuccessfully contain purchaseUrl', function(done) {
                        expect(item).to.have.property('purchaseUrl').that.is.not.undefined;
                        done();
                    });
                    it('item with cart created unsuccessfully should not contain price', function(done) {
                        expect(item).not.to.have.property('price');
                        done();
                    });
                    it('item with cart created unsuccessfully should not contain HasVariations', function(done) {
                        expect(item).not.to.have.property('HasVariations');
                        done();
                    });
                })
            }
        });
        done();
    });

    it('SearchBinSets should not be empty', function(done){
        expect(searchBinSets).not.to.be.undefined;
        done();
    });

    it('Error should be undefined', function(done){
        expect(error).to.be.undefined;
        done();
    })
});

describe('similarityLookup', function(){
    let items;
    before(function(done){
        amazon.similarityLookup(['B01KHZ4ZYY']).then(res=>{
            items = res.Items;
            // console.log(JSON.stringify(res, null, 2));
            done();
        }, err=>{
            console.log(JSON.stringify(err, null, 2));
            done();
        });
    });

    it('Items should not be empty', function(done) {
        expect(items).to.have.length.above(0);
        done();
    });

    it('Items should all contain primeEligible', function(done) {
        expect(items).all.have.property('primeEligible').that.is.not.undefined;
        done();
    });

    it('Check detail properties for each item', function(done) {
        items.forEach(item => {
            if (item.HasVariations) {
                describe('item with variation', function() {
                    it('item with variation contain HasVariations', function(done) {
                        expect(item).to.have.property('HasVariations').that.is.not.undefined;
                        done();
                    });
                    it('item with variation should not contain cartCreated', function(done) {
                        expect(item).not.to.have.property('cartCreated');
                        done();
                    });
                    it('item with variation should not contain purchaseUrl', function(done) {
                        expect(item).not.to.have.property('purchaseUrl');
                        done();
                    });
                    it('item with variation should not contain price', function(done) {
                        expect(item).not.to.have.property('price');
                        done();
                    });
                });
            } else if (item.price) {
                describe('item with cart created successfully', function() {
                    it('item with cart created successfully contain cartCreated', function(done) {
                        expect(item).to.have.property('cartCreated').that.is.not.undefined;
                        done();
                    });
                    it('item with cart created successfully contain purchaseUrl', function(done) {
                        expect(item).to.have.property('purchaseUrl').that.is.not.undefined;
                        done();
                    });
                    it('item with cart created successfully contain price', function(done) {
                        expect(item).to.have.property('price').that.is.not.undefined;
                        done();
                    });
                    it('item with cart created successfully should not contain HasVariations', function(done) {
                        expect(item).not.to.have.property('HasVariations');
                        done();
                    })
                })
            } else {
                describe('item with cart created unsuccessfully', function() {
                    it('item with cart created unsuccessfully contain cartCreated', function(done) {
                        expect(item).to.have.property('cartCreated').that.is.not.undefined;
                        done();
                    });
                    it('item with cart created unsuccessfully contain purchaseUrl', function(done) {
                        expect(item).to.have.property('purchaseUrl').that.is.not.undefined;
                        done();
                    });
                    it('item with cart created unsuccessfully should not contain price', function(done) {
                        expect(item).not.to.have.property('price');
                        done();
                    });
                    it('item with cart created unsuccessfully should not contain HasVariations', function(done) {
                        expect(item).not.to.have.property('HasVariations');
                        done();
                    });
                })
            }
        });
        done();
    });
});

describe('createCart', function(){
    let result, error;
    before(function(done){
        amazon.createCart("B01KHZ4ZYY", 1).then(res=>{
            result = res;
            done();
        }, err=>{
            error = err;
            done();
        })
    });

    it('Cart should contain price', function(done){
        expect(result).to.have.property('price');
        done();
    });

    it('Cart should contain url', function(done){
        expect(result).to.have.property('url');
        done();
    });

    it('Cart should not contain error', function(done){
        expect(error).to.be.undefined;
        done();
    });
});

describe('variationFind', function() {
    let result, error
    before(function(done){
        function flatten(data) {
            var result = [];

            function recurse(cur, prop, curLevel, maxDepth) {
                if (curLevel == maxDepth) {
                    cur.name = prop;
                    result.push(cur);
                } else {
                    var isEmpty = true;
                    for (var p in cur) {
                        isEmpty = false;
                        recurse(cur[p], prop ? prop + "." + p : p, curLevel+1, maxDepth);
                    }
                    if (isEmpty)
                        result.push({});
                }
            }

            recurse(data.map, "", 0, data.variationKeys.length);
            return result;
        }

        amazon.variationFind("B00UTNP2FG").then(res=>{
            result = flatten(res);
            // console.log(JSON.stringify(result, null, 2));
            done();
        }, err => {
            error = err;
            done();
        });
    });

    it('variation map should all contain ASIN', function(done) {
        expect(result).all.have.property('ASIN');
        done();
    });

    it('variation map should all contain image', function(done) {
        expect(result).all.have.property('image');
        done();
    });

    it('variation map should all contain price', function(done) {
        expect(result).all.have.property('price');
        done();
    });

    it('variation map should all contain title', function(done) {
        expect(result).all.have.property('title');
        done();
    });

    it('variation map should all contain primeEligible', function(done) {
        expect(result).all.have.property('primeEligible');
        done();
    });

    it('error should be undefined', function(done){
        expect(error).to.be.undefined;
        done();
    })
});
