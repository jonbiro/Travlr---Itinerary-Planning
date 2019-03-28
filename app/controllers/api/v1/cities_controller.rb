class Api::V1::CitiesController < ApplicationController
  before_action :find_city, only: [:show, :update, :destroy]

  def index
    @cities = City.all
    render json: @cities
  end

  # GET /cities/1
  def show
    render json: @city
  end

  # POST /cities
  def create
    @city = City.new(city_params)

    if @city.save
      render json: @city, status: :created
    else
      render json: @city.errors, status: :unprocessable_entity
    end
  end

  # PATCH/PUT /cities/1
  def update
    if @city.update(city_params)
      render json: @city
    else
      render json: @city.errors, status: :unprocessable_entity
    end
  end

  # DELETE /cities/1
  def destroy
    @city.destroy
  end

  private

  def find_city
    @city = City.find(params[:id])
  end

  def city_params
    params.permit(:name, :trip_id)
  end
end
