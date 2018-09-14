const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const passport = require('passport');

// post model 
const Post = require('../../models/Post');

// profile model 
const Profile = require('../../models/Profile');

// validation
const validatePostInput = require('../../validation/post');

// @route 	GET api/posts/test
// @desc 	Tests posts route
// @access 	Public
router.get('/test', (req, res) => res.json({msg: "Posts works"}));

// @route 	POST api/posts
// @desc 	Create a post
// @access 	Private
router.post('/', passport.authenticate('jwt', { session: false }),
	(req, res) => {
		const { errors, isValid } = validatePostInput(req.body);

		if(!isValid) {
			return res.status(400).json(errors);
		}
		const newPost = new Post({
			text: req.body.text,
			name: req.body.name,
			avatar: req.body.avatar,
			user: req.user.id
		});
		newPost.save().then(post => res.json(post));
});

// @route 	GET api/posts
// @desc 	Get posts
// @access 	Public
router.get('/', (req, res) => {
	Post.find().sort({ date: -1 })
				.then(posts => res.json(posts))
				.catch(err => res.status(404).json({nopostsfound:"No post found"}));
});

// @route 	GET api/posts/:id
// @desc 	Get post by id
// @access 	Public
router.get('/:id', (req, res) => {
	Post.findById(req.params.id)
				.then(post => res.json(post))
				.catch(err => res.status(404).json({ nopostfound:"No post found with that ID" }));
});

// @route 	DELETE api/posts/:id
// @desc 	Delete post
// @access 	Private
router.delete('/:id', passport.authenticate('jwt', { session: false }),
	(req, res) => {
		Profile.findOne({ user: req.user.id })
				.then(profile => {
					Post.findById(req.params.id)
						.then(post => {
							//check for post owner
							if(post.user.toString() !== req.user.id) {
								return res.status(401).json({ notauthorized: "User is not authorized"});
							}

							// delete the post
							post.remove().then(() => res.json({ success: true }))
								.catch(err => res.status(404).json({ nopostfound: "No post found" }));
						})
				})
});

// @route 	POST api/posts/like/:id
// @desc 	Like post
// @access 	Private
router.post('/like/:id', passport.authenticate('jwt', { session: false }),
	(req, res) => {
		Profile.findOne({ user: req.user.id })
				.then(profile => {
					Post.findById(req.params.id)
						.then(post => {
							// user already liked
							if(post.likes.filter(like => like.user.toString() === req.user.id).length > 0) {
								return res.status(400).json({ alreadyliked: 'You have already liked this post'});
							}
							// Add user id to likes array
							post.likes.unshift({ user: req.user.id });
							// save to database
							post.save().then(post => res.json(post));
						})
				})
});

// @route 	POST api/posts/unlike/:id
// @desc 	unLike post
// @access 	Private
router.post('/unlike/:id', passport.authenticate('jwt', { session: false }),
	(req, res) => {
		Profile.findOne({ user: req.user.id })
				.then(profile => {
					Post.findById(req.params.id)
						.then(post => {
							// user already liked
							if(post.likes.filter(like => like.user.toString() === req.user.id).length = 0) {
								return res.status(400).json({ notliked: 'You have not liked the post yet'});
							}
							// get the remove index
							var removeIndex = post.likes.map(item => item.user.toString())
														.indexOf(req.user.id);
							// splice out of array
							post.likes.splice(removeIndex, 1);

							// save the change
							post.save().then(post => res.json(post));

						}).catch(error => res.status(404).json({ postnotfound: 'No post found' }));
				})
});

// @route 	POST api/posts/comment/:id
// @desc 	Add comment to the post
// @access 	Private
router.post('/comment/:id', passport.authenticate('jwt', { session: false }),(req,res) => {
	Post.findById(req.params.id)
		.then(post => {

			const { errors, isValid } = validatePostInput(req.body);

			if(!isValid) {
				return res.status(400).json(errors);
			}

			const newComment = {
				text: req.body.text,
				name: req.body.name,
				avatar: req.body.avatar,
				user: req.user.id
			}

			// add to comment array
			post.comments.unshift(newComment);

			//save to database
			post.save().then(post => res.json(post))
		}).catch(err => res.status(404).json({ postnotfound: "No post found" }));
});

// @route 	DELETE api/posts/comment/:id/:comment_id
// @desc 	Delete comment from post
// @access 	Private
router.delete('/comment/:id/:comment_id', passport.authenticate('jwt', { session: false }),
	(req, res) => {
		Post.findById(req.params.id)
		.then(post => {
			// check whether the comment exists
			if(post.comments.filter(comment => comment._id.toString() === req.params.comment_id).length == 0) {
				return res.status(404).json({ commentnotfound: "Comment does not exist"});
			}

			// get remove index 
			const removeIndex = post.comments.map(item => item._id.toString())
											.indexOf(req.params.comment_id);
			// remove the comment out of array
			post.comments.splice(removeIndex,1);

			post.save().then(post => res.json(post));
		}).catch(err => res.status(404).json({ commentnotfound: "No comment found" }));
});

module.exports = router;